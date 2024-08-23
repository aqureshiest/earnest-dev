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

        // Check if the commit exists in the BranchCommits table
        const commitExists = await this.dbService.getBranchCommit(owner, repo, ref);
        if (commitExists) {
            console.log("Skipping indexing, commit already exists.");
            return result; // Skip indexing
        }

        const files = await this.ghService.getFiles(owner, repo, ref, path);
        // exclude files that match the patterns
        const filteredFiles = files.filter((file) => !RepositoryService.shouldExclude(file.name));

        // process each file
        for (const file of filteredFiles) {
            if (file.type === "file") {
                // send message
                await channel.publish("overall", `file:${file.path}`);

                // check if we already have this file in the store
                const savedFile = await this.dbService.getFileDetails(owner, repo, ref, file.path);
                // make sure the commit hash is the same
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

        // Store the new commit in the BranchCommits table
        await this.dbService.saveBranchCommit(owner, repo, ref, commitHash);

        return result;
    }

    // Other methods remain unchanged...
}
