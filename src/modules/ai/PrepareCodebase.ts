import { RepositoryDataService } from "../db/RepositoryDataService";
import { RepositoryService } from "../github/RepositoryService";
import { TokenLimiter } from "./support/TokenLimiter";
import { EmbeddingService } from "./support/EmbeddingService";
import { sendTaskUpdate } from "../utils/sendTaskUpdate";

export class PrepareCodebase {
    repositoryService: RepositoryService;
    dataService: RepositoryDataService;
    embeddingService: EmbeddingService;

    constructor() {
        this.repositoryService = new RepositoryService();
        this.dataService = new RepositoryDataService();
        this.embeddingService = new EmbeddingService();
    }

    async prepare(taskRequest: CodingTaskRequest) {
        const { owner, repo, branch, task: description, taskId } = taskRequest;

        // lets get the branch commit hash from github
        sendTaskUpdate(taskId, "progress", "Checking branch sync status...");
        const isSynced = await this.repositoryService.isBranchSynced(owner, repo, branch);
        if (isSynced) {
            // files ready to be processed
            sendTaskUpdate(taskId, "progress", "Branch is already synced.");
        } else {
            // prepare repository for processing
            sendTaskUpdate(taskId, "progress", "Indexing repository...");
            const files: FileDetails[] = await this.repositoryService.getRepositoryFiles(
                owner,
                repo,
                branch
            );
            sendTaskUpdate(taskId, "progress", `Fetched ${files.length} files.`);

            sendTaskUpdate(taskId, "progress", "Tokenizing files...");
            const filesWithContent: FileDetails[] = await this.repositoryService.fetchFiles(files);
            const tokenizedFiles: FileDetails[] = new TokenLimiter().tokenizeFiles(
                filesWithContent
            );

            sendTaskUpdate(taskId, "progress", "Embedding files...");
            const filesWithEmbeddings =
                await this.embeddingService.generateEmbeddingsForFilesInChunks(tokenizedFiles);

            // check if token limits removed any files
            if (filesWithEmbeddings.length < tokenizedFiles.length) {
                sendTaskUpdate(
                    taskId,
                    "progress",
                    `Removed ${
                        tokenizedFiles.length - filesWithEmbeddings.length
                    } files from context due to embedding token limits.`
                );
            }

            // sync branch
            sendTaskUpdate(taskId, "progress", "Syncing branch...");
            await this.repositoryService.syncBranch(owner, repo, branch, filesWithEmbeddings);
        }

        // look up files similar to the description
        const filesToUse = await this.dataService.findSimilar(description, owner, repo, branch);

        return filesToUse;
    }
}
