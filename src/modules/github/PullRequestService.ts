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
        const lastCommit = await this.dbService.getFileDetails(this.owner, this.repo, this.branch, "commitSHA");
        const currentCommitSHA = await this.octokit.git.getRef({
            owner: this.owner,
            repo: this.repo,
            ref: `heads/${this.branch}`,
        });

        if (lastCommit.commitHash === currentCommitSHA.data.object.sha) {
            // Retrieve files from the database
            const files = await this.dbService.getAllFileDetails(this.owner, this.repo, this.branch);
            // Process files as needed
        } else {
            // Fetch all files from GitHub
            const files = await this.octokit.repos.getContent({
                owner: this.owner,
                repo: this.repo,
                ref: this.branch,
            });
            // Process files as needed
        }

        // After processing, update the database with the current commit SHA
        await this.dbService.saveFileDetails({
            owner: this.owner,
            repo: this.repo,
            ref: this.branch,
            commitHash: currentCommitSHA.data.object.sha,
        });

        // Continue with the existing logic to create a pull request
        // ...
    }

    // Other existing methods...
}
