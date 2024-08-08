import { Octokit } from "@octokit/rest";

class PullRequestService {
    private octokit: Octokit;
    private owner: string;
    private repo: string;
    private branch: string;

    constructor(owner: string, repo: string, branch: string) {
        this.octokit = new Octokit({
            auth: process.env.GITHUB_TOKEN,
        });
        this.owner = owner;
        this.repo = repo;
        this.branch = branch;
    }

    async createPullRequest(codeChanges: CodeChanges, prTitle: string, prBody: string, author: string) {
        const newBranch = `pr-${Date.now()}`;

        try {
            // Get the default branch reference
            const { data: refData } = await this.octokit.git.getRef({
                owner: this.owner,
                repo: this.repo,
                ref: `heads/${this.branch}`,
            });

            const baseSha = refData.object.sha;

            // Create a new branch
            await this.octokit.git.createRef({
                owner: this.owner,
                repo: this.repo,
                ref: `refs/heads/${newBranch}`,
                sha: baseSha,
            });

            // Create a new tree with all the changes
            const newTreeSha = await this.createTreeWithChanges(newBranch, baseSha, codeChanges);

            // Create a new commit with the tree
            const { data: commitData } = await this.octokit.git.createCommit({
                owner: this.owner,
                repo: this.repo,
                message: prTitle,
                tree: newTreeSha,
                parents: [baseSha],
            });

            // Update the branch to point to the new commit
            await this.octokit.git.updateRef({
                owner: this.owner,
                repo: this.repo,
                ref: `heads/${newBranch}`,
                sha: commitData.sha,
            });

            // Create the pull request
            const fullPrBody = `${prBody}\n\nAuthor: ${author}`; // Include author in the PR body
            const { data: prData } = await this.octokit.pulls.create({
                owner: this.owner,
                repo: this.repo,
                title: prTitle,
                head: newBranch,
                base: this.branch,
                body: fullPrBody, // Use updated body
            });

            return prData.html_url;
        } catch (error) {
            console.error("Error creating pull request:", error);
            return null;
        }
    }

    // Other methods remain unchanged...
}
