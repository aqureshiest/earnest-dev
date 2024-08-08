import { DatabaseService } from "../db/SupDatabaseService";
import { GitHubService } from "./GitHubService";

export class BranchService {
    private ghService: GitHubService;
    private dbService: DatabaseService;

    constructor() {
        this.ghService = new GitHubService();
        this.dbService = new DatabaseService();
    }

    async prepareBranchForPR(owner: string, repo: string, ref: string) {
        try {
            // retrieve branch from GitHub
            const githubBranch = await this.ghService.getBranch(owner, repo, ref);
            if (!githubBranch) {
                throw new Error(`Branch ${ref} not found in ${owner}/${repo}`);
            }

            // retrieve stored branch
            let branch = await this.dbService.getBranch(owner, repo, ref);

            // determine if branch is up to date
            const upToDate = branch?.commitHash === githubBranch.commit.sha;

            if (!branch || !upToDate) {
                // save branch to database with the latest commit
                branch = await this.dbService.saveBranch({
                    owner,
                    repo,
                    ref,
                    commitHash: githubBranch.commit.sha,
                });
            }

            return {
                upToDate,
                branch: branch,
            };
        } catch (error: any) {
            console.error(`Error preparing branch for PR: ${error.message}`);
            throw error;
        }
    }
}
