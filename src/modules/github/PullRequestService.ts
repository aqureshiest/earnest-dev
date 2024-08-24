import { Octokit } from "@octokit/rest";
import { execSync } from "child_process";
import DatabaseService from "@/modules/db/SupDatabaseService";

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
        const currentCommitSHA = await this.dbService.getCurrentBranchCommitSHA(this.owner, this.repo, this.branch);
        const storedCommitSHA = await this.dbService.getBranchCommitSHA(this.owner, this.repo, this.branch);

        if (storedCommitSHA === currentCommitSHA) {
            // Retrieve files from the database
            const files = await this.dbService.getFilesByCommitSHA(storedCommitSHA);
            console.log("Retrieved files from database:", files);
        } else {
            // Fetch all files from the repository
            const files = await this.dbService.getAllFiles(this.owner, this.repo, this.branch);
            console.log("Fetched all files from repository:", files);
            // Update the database with the new commit SHA
            await this.dbService.storeBranchCommitSHA(this.owner, this.repo, this.branch, currentCommitSHA);
        }

        // Continue with the rest of the pull request creation process...
        // (existing code for creating a pull request)
    }

    // ... (rest of the existing methods)
}

export default PullRequestService;