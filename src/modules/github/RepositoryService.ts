import { EXCLUDE_PATTERNS } from "@/constants";
import { GitHubService } from "./GitHubService";
import { DatabaseService } from "../db/SupDatabaseService";

export class RepositoryService {
    private ghService: GitHubService;
    private dbService: DatabaseService;

    constructor() {
        this.ghService = new GitHubService();
        this.dbService = new DatabaseService();
    }

    async getRepositoryFiles(
        owner: string,
        repo: string,
        ref: string = "main",
        path: string = "",
        skipFolders: string[] = [],
        skipFiles: string[] = [],
        channel: any
    ): Promise<FileDetails[]> {
        let result: FileDetails[] = [];

        const files = await this.ghService.getFiles(owner, repo, ref, path);
        const filteredFiles = files.filter(
            (file) => !RepositoryService.shouldExclude(file.name, skipFolders, skipFiles)
        );

        for (const file of filteredFiles) {
            if (file.type === "file") {
                await channel.publish("overall", `file:${file.path}`);
                const savedFile = await this.dbService.getFileDetails(owner, repo, ref, file.path);
                if (savedFile && savedFile.commitHash === file.sha) {
                    console.log("Using saved file >>", file.path, savedFile.commitHash);
                    result.push(savedFile);
                } else {
                    console.log("New file >> ", file.path);
                    result.push({
                        name: file.name,
                        path: file.path,
                        owner,
                        repo,
                        ref,
                        content: "",
                        commitHash: file.sha,
                        embeddings: [],
                        tokenCount: 0,
                    });
                }
            } else if (file.type === "dir" && !file.name.startsWith(".")) {
                const nestedFiles = await this.getRepositoryFiles(
                    owner,
                    repo,
                    ref,
                    file.path,
                    skipFolders,
                    skipFiles,
                    channel
                );
                result.push(...nestedFiles);
            }
        }

        // Retrieve the current commit hash after indexing
        const currentCommitHash = await this.ghService.getBranch(owner, repo, ref);
        console.log("Current commit hash:", currentCommitHash);

        return result;
    }

    // ... (rest of the existing code)
}
