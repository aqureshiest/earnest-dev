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

    async createPullRequest(codeChanges: CodeChanges, prTitle: string, prBody: string) {
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
            const { data: prData } = await this.octokit.pulls.create({
                owner: this.owner,
                repo: this.repo,
                title: prTitle,
                head: newBranch,
                base: this.branch,
                body: prBody,
            });

            return prData.html_url;
        } catch (error) {
            console.error("Error creating pull request:", error);
            return null;
        }
    }

    private async createTreeWithChanges(branch: string, baseSha: string, codeChanges: CodeChanges) {
        const changes: any[] = [];
        const newFiles = [];

        // add codeChanges.newFiles to newFiles
        newFiles.push(...codeChanges.newFiles);

        for (const modifiedFile of codeChanges.modifiedFiles || []) {
            try {
                const { data: fileData } = await this.octokit.repos.getContent({
                    owner: this.owner,
                    repo: this.repo,
                    path: modifiedFile.path,
                    ref: `heads/${branch}`,
                });

                // check if file is a directory
                if (Array.isArray(fileData)) {
                    throw new Error(`Cannot update file ${modifiedFile}. It is a directory.`);
                }

                changes.push({
                    path: modifiedFile.path,
                    mode: "100644",
                    type: "blob",
                    content: modifiedFile.content,
                    // sha: fileData.sha,   // this seems to throw an error
                });
            } catch (error) {
                console.error(`Error updating file ${modifiedFile.path}:`, error);
                console.log(`treating as new ${modifiedFile.path} file`);

                // treat it as new
                newFiles.push(modifiedFile);
            }
        }

        for (const newFile of codeChanges.newFiles || []) {
            if (newFile) {
                changes.push({
                    path: newFile.path,
                    mode: "100644",
                    type: "blob",
                    content: newFile.content,
                });
            }
        }

        for (const deletedFile of codeChanges.deletedFiles || []) {
            try {
                // skip empty or current directory
                if (!deletedFile || deletedFile == ".") {
                    continue;
                }

                const { data: fileData } = await this.octokit.repos.getContent({
                    owner: this.owner,
                    repo: this.repo,
                    path: deletedFile,
                    ref: `heads/${branch}`,
                });

                // check if file is a directory
                if (Array.isArray(fileData)) {
                    console.log(`Cannot delete file ${deletedFile}. It is a directory.`);
                    throw new Error(`Cannot delete file ${deletedFile}. It is a directory.`);
                }

                changes.push({
                    path: deletedFile,
                    mode: "100644",
                    type: "blob",
                    sha: null, // to indicate delete
                });
            } catch (error) {
                console.error(`Error deleting file ${deletedFile}:`, error);
            }
        }

        const { data: treeData } = await this.octokit.git.createTree({
            owner: this.owner,
            repo: this.repo,
            tree: changes,
            base_tree: baseSha,
        });

        return treeData.sha;
    }
}

export default PullRequestService;
