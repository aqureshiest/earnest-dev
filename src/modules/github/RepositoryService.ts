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
        // ... (existing code)
    }

    async findSimilar(description: string, owner: string, repo: string, branch: string): Promise<FileDetails[]> {
        // Utilize the new table to find relevant files based on the stored commit information
        const commitHash = await this.dbService.getBranchCommit(owner, repo, branch);
        if (commitHash) {
            // Logic to find similar files based on the commit hash
            // ...
        }
        // Fallback to existing logic if no commit hash is found
        return await this.dbService.findSimilar(description, owner, repo, branch);
    }
}