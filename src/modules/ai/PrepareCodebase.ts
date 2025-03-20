import { RepositoryService } from "../github/RepositoryService";
import { TokenLimiter } from "./support/TokenLimiter";
import { RepositoryDataService } from "../db/RepositoryDataService";
import { CodeIndexer } from "./support/CodeIndexer";
import { sendTaskUpdate } from "../utils/sendTaskUpdate";
import { reportError } from "../bugsnag/report";

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
        try {
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
            const indexResult = await this.indexer.processFilesIntoChunks(
                tokenizedFiles,
                owner,
                repo,
                branch,
                taskId
            );

            // Log minor failures without reporting errors
            if (indexResult.failedFiles.length > 0) {
                console.log(
                    `${indexResult.failedFiles.length} files failed to process but were below the failure threshold.`
                );
            }

            // 5. Sync branch with file data
            sendTaskUpdate(taskId, "progress", "Syncing branch...");
            await this.repositoryService.syncBranch(owner, repo, branch, tokenizedFiles);
        } catch (error: any) {
            // Log and report the error
            console.error(`Error in syncAndIndexRepository: ${error}`);
            reportError(error instanceof Error ? error : new Error(String(error)), {
                codeIndexer: {
                    operation: "syncAndIndexRepository",
                    owner,
                    repo,
                    branch,
                    taskId,
                    model,
                },
            });

            sendTaskUpdate(
                taskId,
                "error",
                `Repository indexing failed: ${error.message || String(error)}`
            );

            // Re-throw the error to prevent the calling code from assuming the branch is synced
            throw error;
        }
    }
}
