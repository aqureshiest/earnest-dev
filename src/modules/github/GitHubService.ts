import { Octokit } from "@octokit/rest";

export class GitHubService {
    private octokit: Octokit;

    constructor() {
        this.octokit = new Octokit({
            auth: process.env.GITHUB_TOKEN,
        });
    }

    async listRepos(owner?: string) {
        try {
            if (owner) {
                const { data: repos } = await this.octokit.repos.listForUser({
                    username: owner,
                    sort: 'updated',
                    direction: 'desc'
                });
                return repos;
            } else {
                const { data: repos } = await this.octokit.repos.listForAuthenticatedUser({
                    visibility: "all",
                });
                return repos;
            }
        } catch (error: any) {
            if (error.status === 404) {
                throw new Error(`User ${owner} not found or you don't have access to their repositories.`);
            } else if (error.status === 403) {
                throw new Error("API rate limit exceeded or insufficient permissions.");
            } else {
                throw new Error(`Failed to fetch repositories: ${error.message}`);
            }
        }
    }

    async listBranches(owner: string, repo: string) {
        const { data: branches } = await this.octokit.repos.listBranches({
            owner,
            repo,
        });

        return branches;
    }

    async getBranch(owner: string, repo: string, ref: string = "main") {
        const { data: branch } = await this.octokit.repos.getBranch({
            owner,
            repo,
            branch: ref,
        });

        return branch;
    }

    async getBranchCommit(owner: string, repo: string, branch: string) {
        const { data: branchData } = await this.octokit.repos.getBranch({
            owner,
            repo,
            branch,
        });

        return branchData.commit.sha;
    }

    async listRepoFiles(owner: string, repo: string, branch: string = "main") {
        const { data: branchInfo } = await this.octokit.repos.getBranch({
            owner,
            repo,
            branch,
        });
        const commitSha = branchInfo.commit.sha;

        const { data: treeData } = await this.octokit.git.getTree({
            owner,
            repo,
            tree_sha: commitSha,
            recursive: "true",
        });

        const files = treeData.tree
            .filter((item) => item.type === "blob")
            .map((file) => ({
                name: file.path?.split("/").pop(),
                path: file.path,
                sha: file.sha,
                type: file.type,
            }));

        return files;
    }

    async readFile(owner: string, repo: string, ref: string = "main", path: string) {
        const { data: content } = await this.octokit.repos.getContent({
            owner,
            repo,
            ref,
            path,
        });

        return content;
    }

    async getPrimaryLanguage(owner: string, repo: string) {
        try {
            const { data: languages } = await this.octokit.repos.listLanguages({
                owner,
                repo,
            });

            // Find the language with the highest percentage
            const totalBytes = Object.values(languages).reduce((acc, bytes) => acc + bytes, 0);
            const primaryLanguage = Object.entries(languages).reduce(
                (max, [language, bytes]) => {
                    const percentage = (bytes / totalBytes) * 100;
                    return percentage > max.percentage ? { language, percentage } : max;
                },
                { language: "", percentage: 0 }
            );

            return primaryLanguage.language;
        } catch (error) {
            console.error("Error fetching repository languages:", error);
        }
    }
}