import { Octokit } from "@octokit/rest";
import { execSync } from "child_process";
import { DatabaseService } from "@/modules/db/SupDatabaseService";

class PullRequestService {
    private octokit: Octokit;
    private owner: string;
    private repo: string;
    private branch: string;
    private dbService: DatabaseService;

    constructor(owner: string, repo: string, branch: string) {
        this.octokit = new Octokit({
            auth: process.env.GITHUB_TOKEN,
        });
        this.owner = owner;
        this.repo = repo;
        this.branch = branch;
        this.dbService = new DatabaseService();
    }

    async createPullRequest(codeChanges: CodeChanges, prTitle: string, prBody: string) {
        const currentCommitSHA = await this.octokit.repos.getCommit({
            owner: this.owner,
            repo: this.repo,
            ref: this.branch,
        }).then(res => res.data.sha);

        const storedCommitSHA = await this.dbService.getBranchCommitSHA(this.owner, this.repo, this.branch);

        if (storedCommitSHA === currentCommitSHA) {
            // Retrieve files from the database
            const files = await this.dbService.getFileDetails(this.owner, this.repo, this.branch);
            console.log("Retrieved files from database:", files);
            // Proceed with creating the pull request using these files
        } else {
            // Fetch all files from the repository
            const allFiles = await this.getAllFiles();
            console.log("Fetched all files from repository:", allFiles);
            // Update the database with the new commit SHA
            await this.dbService.updateBranchCommitSHA(this.owner, this.repo, this.branch, currentCommitSHA);
        }

        // Continue with the rest of the pull request creation process...
    }

    private async getAllFiles() {
        // Logic to fetch all files from the repository
    }
}

export default PullRequestService;