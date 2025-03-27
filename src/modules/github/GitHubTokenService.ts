import { Octokit } from "@octokit/rest";

// deprecated (can use in local dev mode)
// use GitHubService instead and setup GitHub App auth
export class GitHubTokenService {
    private octokit: Octokit;
    private rateLimitWarningThreshold = 100; // Warn when remaining calls are below this

    constructor() {
        this.octokit = new Octokit({
            auth: process.env.GITHUB_TOKEN,
        });
    }

    async listRepos(query = "", per_page = 25) {
        let repos;

        if (query) {
            // Search for repositories matching the query
            const { data } = await this.octokit.search.repos({
                q: `${query} user:${process.env.NEXT_PUBLIC_GITHUB_OWNER}`,
                per_page,
            });
            return data; // Already has items and total_count
        } else {
            // Just get first page of repos when no query
            const { data } = await this.octokit.repos.listForAuthenticatedUser({
                visibility: "all",
                per_page,
            });

            // Format response to match search API
            repos = {
                items: data,
                total_count: data.length, // This is not accurate, would need additional API call
            };
        }

        return repos;
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

    async validateRateLimit() {
        const { data: rateLimit } = await this.octokit.rateLimit.get();
        if (rateLimit.resources.core.remaining < this.rateLimitWarningThreshold) {
            console.warn(
                `GitHub API rate limit warning: ${rateLimit.resources.core.remaining} calls remaining`
            );
            return false;
        }
        return true;
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

    async listCommits(owner: string, repo: string, branch: string = "main", path: string) {
        const { data: commits } = await this.octokit.repos.listCommits({
            owner,
            repo,
            sha: branch,
            path,
        });

        return commits;
    }
}
