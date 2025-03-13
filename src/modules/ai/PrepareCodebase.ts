import { RepositoryService } from "../github/RepositoryService";
import { TokenLimiter } from "./support/TokenLimiter";
import { RepositoryDataService } from "../db/RepositoryDataService";
import { CodeIndexer } from "./support/CodeIndexer";
import { sendTaskUpdate } from "../utils/sendTaskUpdate";

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

    async prepare(taskRequest: CodingTaskRequest): Promise<FileDetails[]> {
        const { owner, repo, branch, task: description, taskId, model } = taskRequest;

        // Check if branch is already synced
        sendTaskUpdate(taskId, "progress", "Checking branch sync status...");
        const isSynced = await this.repositoryService.isBranchSynced(owner, repo, branch);

        if (!isSynced) {
            // Branch is not synced, we need to do a full sync and index
            await this.syncAndIndexRepository(owner, repo, branch, taskId, model);
        }

        // Find similar files based on description or return all files
        if (description) {
            sendTaskUpdate(taskId, "progress", "Finding relevant files...");
            const embedding = await this.indexer.generateEmbedding(description);
            // Return matching files
            return await this.dataService.findSimilarFilesByChunks(owner, repo, branch, embedding);
        } else {
            // Return all files
            return await this.repositoryService.getRepositoryFiles(owner, repo, branch);
        }
    }

    private async syncAndIndexRepository(
        owner: string,
        repo: string,
        branch: string,
        taskId: string,
        model: string
    ): Promise<void> {
        // 1. Fetch repository files and process only the ones that need processing
        sendTaskUpdate(taskId, "progress", "Indexing repository...");
        const files: FileDetails[] = (
            await this.repositoryService.getRepositoryFiles(owner, repo, branch)
        ).filter((f) => f.needsProcessing);
        sendTaskUpdate(taskId, "progress", `Found ${files.length} files that need processing.`);

        // 2. Fetch file contents
        sendTaskUpdate(taskId, "progress", "Tokenizing files...");
        const filesWithContent: FileDetails[] = await this.repositoryService.fetchFiles(files);

        // 3. Tokenize files
        const tokenizedFiles: FileDetails[] = this.tokenLimiter.tokenizeFiles(
            filesWithContent,
            model
        );

        // 4. Process and index chunks for all files
        sendTaskUpdate(taskId, "progress", "Processing files into chunks...");
        await this.indexer.processFilesIntoChunks(tokenizedFiles, owner, repo, branch, taskId);

        // 5. Sync branch with file data
        sendTaskUpdate(taskId, "progress", "Syncing branch...");
        await this.repositoryService.syncBranch(owner, repo, branch, tokenizedFiles);
    }
}
