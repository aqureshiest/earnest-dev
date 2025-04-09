import { Octokit } from "@octokit/rest";
import { CodeGenMetricsService } from "../metrics/generate/CodeGenMetricsService";
import * as Diff from "diff";

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

    async createPatch(codeChanges: CodeChanges, patchTitle: string): Promise<string> {
        try {
            const authorEmail = `${process.env.NEXT_PUBLIC_GITHUB_OWNER}@earnest.com`;

            // Get the repository information to include in the patch
            const { data: repoData } = await this.octokit.repos.get({
                owner: this.owner,
                repo: this.repo,
            });

            // Get the default branch reference for the SHA
            const { data: refData } = await this.octokit.git.getRef({
                owner: this.owner,
                repo: this.repo,
                ref: `heads/${this.branch}`,
            });

            const baseSha = refData.object.sha;
            const timestamp = new Date().toISOString();
            const author = `Generated Patch <${authorEmail}>`;

            // Start building the patch
            let patch = `From ${baseSha} Mon Sep 17 00:00:00 2001\n`;
            patch += `From: ${author}\n`;
            patch += `Date: ${timestamp}\n`;
            patch += `Subject: [PATCH] ${patchTitle}\n\n`;

            // Add a patch description if needed
            patch += `${patchTitle}\n\n`;
            patch += `Repo: ${repoData.full_name}\n`;
            patch += `Branch: ${this.branch}\n\n`;
            patch += `---\n\n`;

            // Process new files
            for (const file of codeChanges.newFiles || []) {
                if (!file) continue;

                patch += `diff --git a/${file.path} b/${file.path}\n`;
                patch += `new file mode 100644\n`;
                patch += `index 0000000..${this.generateShortHash(file.content)}\n`;
                patch += `--- /dev/null\n`;
                patch += `+++ b/${file.path}\n`;

                // Add file content as a complete addition
                const lines = file.content.split("\n");
                patch += `@@ -0,0 +1,${lines.length} @@\n`;

                for (const line of lines) {
                    patch += `+${line}\n`;
                }

                patch += "\n";
            }

            // Process modified files
            for (const file of codeChanges.modifiedFiles || []) {
                // Try to get the original file content
                let originalContent = "";
                try {
                    const { data: fileData } = await this.octokit.repos.getContent({
                        owner: this.owner,
                        repo: this.repo,
                        path: file.path,
                        ref: `heads/${this.branch}`,
                    });

                    if (!Array.isArray(fileData) && fileData.type === "file" && fileData.content) {
                        originalContent = Buffer.from(fileData.content, "base64").toString("utf8");
                    }
                } catch (error) {
                    console.warn(
                        `Could not get original content for ${file.path}. Treating as a new file.`
                    );
                }

                patch += `diff --git a/${file.path} b/${file.path}\n`;
                patch += `index ${this.generateShortHash(
                    originalContent
                )}..${this.generateShortHash(file.content)} 100644\n`;
                patch += `--- a/${file.path}\n`;
                patch += `+++ b/${file.path}\n`;

                // If we have the original content, generate a proper diff
                if (originalContent) {
                    const diff = this.generateAccurateDiff(originalContent, file.content);
                    patch += diff;
                } else {
                    // Otherwise treat it like a new file
                    const lines = file.content.split("\n");
                    patch += `@@ -0,0 +1,${lines.length} @@\n`;

                    for (const line of lines) {
                        patch += `+${line}\n`;
                    }
                }

                patch += "\n";
            }

            // Process deleted files
            for (const file of codeChanges.deletedFiles || []) {
                if (!file || file.path === ".") continue;

                // Try to get the original file content
                let originalContent = "";
                try {
                    const { data: fileData } = await this.octokit.repos.getContent({
                        owner: this.owner,
                        repo: this.repo,
                        path: file.path,
                        ref: `heads/${this.branch}`,
                    });

                    if (!Array.isArray(fileData) && fileData.type === "file" && fileData.content) {
                        originalContent = Buffer.from(fileData.content, "base64").toString("utf8");
                    }
                } catch (error) {
                    console.warn(
                        `Could not get original content for ${file.path}. Skipping deletion in patch.`
                    );
                    continue;
                }

                patch += `diff --git a/${file.path} b/${file.path}\n`;
                patch += `deleted file mode 100644\n`;
                patch += `index ${this.generateShortHash(originalContent)}..0000000\n`;
                patch += `--- a/${file.path}\n`;
                patch += `+++ /dev/null\n`;

                // Show the removal of all lines
                const originalLines = originalContent.split("\n");
                patch += `@@ -1,${originalLines.length} +0,0 @@\n`;

                for (const line of originalLines) {
                    patch += `-${line}\n`;
                }

                patch += "\n";
            }

            // Finalize the patch
            patch += `-- \n`;
            patch += `${repoData.full_name} patch\n`;

            return patch;
        } catch (error: any) {
            console.error("Error creating patch:", error);
            throw new Error(`Failed to create patch: ${error.message}`);
        }
    }

    private generateShortHash(content: string): string {
        // This is a simple hash function for demonstration
        // In a real implementation, you might use a proper git hash algorithm
        let hash = 0;
        if (content.length === 0) return "0000000";

        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32bit integer
        }

        // Return a 7-character hex string (like git short hashes)
        return Math.abs(hash).toString(16).substring(0, 7).padStart(7, "0");
    }

    private generateAccurateDiff(originalContent: string, newContent: string): string {
        const cleanOriginal = this.removeTrailingWhitespace(originalContent);
        const cleanNew = this.removeTrailingWhitespace(newContent);

        const patch = Diff.createPatch(
            "file", // This is just a placeholder as the real filename is used elsewhere
            cleanOriginal,
            cleanNew,
            "original",
            "modified"
        );

        // Extract just the hunk headers and content, not the file headers
        const lines = patch.split("\n");
        return lines.slice(4).join("\n");
    }

    async createPullRequest(codeChanges: CodeChanges, prTitle: string, prBody: string) {
        const newBranch = `pr-${Date.now()}`;

        const metricsService = new CodeGenMetricsService();

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

            // Add "AI-Generated" label to the pull request
            try {
                await this.octokit.issues.addLabels({
                    owner: this.owner,
                    repo: this.repo,
                    issue_number: prData.number,
                    labels: ["AI-Generated"],
                });
                console.log(`Added "AI-Generated" label to PR #${prData.number}`);
            } catch (labelError) {
                // Log the error but don't fail the PR creation
                console.error(`Error adding "AI-Generated" label to PR #${prData.number}:`, labelError);
                console.log("PR was created successfully, but label could not be added");
            }

            // Count files for the PR creation metric
            const fileCount =
                (codeChanges.newFiles?.length || 0) +
                (codeChanges.modifiedFiles?.length || 0) +
                (codeChanges.deletedFiles?.length || 0);
            await metricsService.trackPRCreation({ owner: this.owner, repo: this.repo }, fileCount);

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
                if (!deletedFile || deletedFile.path == ".") {
                    continue;
                }

                const { data: fileData } = await this.octokit.repos.getContent({
                    owner: this.owner,
                    repo: this.repo,
                    path: deletedFile.path,
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

    private removeTrailingWhitespace(content: string): string {
        return content
            .split("\n")
            .map((line) => line.trimRight())
            .join("\n");
    }
}

export default PullRequestService;