import { RepositoryService } from "../github/RepositoryService";
import { TokenLimiter } from "./support/TokenLimiter";
import { RepositoryDataService } from "../db/RepositoryDataService";
import { CodeIndexer } from "./support/CodeIndexer";
import { sendTaskUpdate } from "../redis/RedisTaskManager";

export class PrepareCodebase {
    private repositoryService: RepositoryService;
    private tokenLimiter: TokenLimiter;
    private dataService: RepositoryDataService;
    private indexer: CodeIndexer;

    constructor() {
        this.repositoryService = new RepositoryService();
        this.tokenLimiter = new TokenLimiter();
        this.dataService = new RepositoryDataService();
        this.indexer = new CodeIndexer();
    }

    async prepare(taskRequest: CodingTaskRequest) {
        const { owner, repo, branch, task: description, taskId } = taskRequest;

        // Check if branch is already synced
        sendTaskUpdate(taskId, "progress", "Checking branch sync status...");
        const isSynced = await this.repositoryService.isBranchSynced(owner, repo, branch);

        if (!isSynced) {
            // Branch is not synced, we need to do a full sync and index
            await this.syncAndIndexRepository(owner, repo, branch, taskId);
        }

        // Find similar files based on description or return all files
        if (description) {
            sendTaskUpdate(taskId, "progress", "Finding relevant files...");
            const embedding = await this.indexer.generateEmbedding(description);

            return await this.dataService.findSimilarFilesByChunks(
                description,
                owner,
                repo,
                branch,
                embedding
            );
        } else {
            // Return all files
            return await this.repositoryService.getRepositoryFiles(owner, repo, branch);
        }
    }

    private async syncAndIndexRepository(
        owner: string,
        repo: string,
        branch: string,
        taskId: string
    ): Promise<void> {
        // 1. Fetch repository files
        sendTaskUpdate(taskId, "progress", "Indexing repository...");
        const files: FileDetails[] = await this.repositoryService.getRepositoryFiles(
            owner,
            repo,
            branch
        );
        sendTaskUpdate(taskId, "progress", `Fetched ${files.length} files.`);

        // 2. Fetch file contents
        sendTaskUpdate(taskId, "progress", "Tokenizing files...");
        const filesWithContent: FileDetails[] = await this.repositoryService.fetchFiles(files);

        // 3. Tokenize files
        const tokenizedFiles: FileDetails[] = this.tokenLimiter.tokenizeFiles(filesWithContent);

        // 4. Process and index chunks for all files
        sendTaskUpdate(taskId, "progress", "Processing files into chunks...");
        await this.indexer.processFilesIntoChunks(tokenizedFiles, owner, repo, branch, taskId);

        // 5. Sync branch with file data
        sendTaskUpdate(taskId, "progress", "Syncing branch...");
        await this.repositoryService.syncBranch(owner, repo, branch, tokenizedFiles);
    }
}
