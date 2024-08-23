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
        channel: any
    ): Promise<FileDetails[]> {
        let result: FileDetails[] = [];

        const files = await this.ghService.getFiles(owner, repo, ref, path);
        const filteredFiles = files.filter((file) => !RepositoryService.shouldExclude(file.name));

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
                    channel
                );
                result.push(...nestedFiles);
            }
        }

        // Check if the current branch's commit exists in the new table
        const currentCommitHash = "currentCommitHash"; // Replace with actual logic to get current commit hash
        const commitExists = await this.dbService.getBranchCommit(owner, repo, ref, currentCommitHash);
        if (!commitExists) {
            // Proceed with indexing and save the commit
            await this.dbService.saveBranchCommit(owner, repo, ref, currentCommitHash);
        }

        return result;
    }

    static shouldExclude(filePath: string): boolean {
        return EXCLUDE_PATTERNS.some((pattern) => {
            if (pattern.endsWith("/")) {
                return filePath.includes(pattern);
            } else {
                return filePath.endsWith(pattern);
            }
        });
    }
}
