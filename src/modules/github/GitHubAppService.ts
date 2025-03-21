import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";

export class GitHubAppService {
    private octokit: Octokit;
    private owner: string;
    private rateLimitWarningThreshold = 100; // Warn when remaining calls are below this
    private debug: boolean;

    constructor() {
        console.log("Initializing GitHub App service");

        // Enable debug based on environment variable (defaults to false)
        this.debug = process.env.GITHUB_DEBUG === "true";

        // Make sure to properly format the private key if it's a single line with \n characters
        const privateKey = process.env.GITHUB_PRIVATE_KEY?.replace(/\\n/g, "\n") || "";
        this.owner = process.env.NEXT_PUBLIC_GITHUB_OWNER || "";

        if (this.debug) {
            console.log(`Initializing GitHub App with App ID: ${process.env.GITHUB_APP_ID}`);
            console.log(`Installation ID: ${process.env.GITHUB_INSTALLATION_ID}`);
            console.log(`Private key length: ${privateKey.length} characters`);
            console.log(`Owner: ${this.owner}`);
        }

        try {
            this.octokit = new Octokit({
                authStrategy: createAppAuth,
                auth: {
                    appId: process.env.GITHUB_APP_ID,
                    privateKey: privateKey,
                    installationId: process.env.GITHUB_INSTALLATION_ID,
                },
            });

            if (this.debug) {
                console.log("Successfully created Octokit instance with GitHub App auth");
            }
        } catch (error) {
            console.error("Failed to initialize Octokit with GitHub App auth:", error);
            throw error;
        }
    }

    async listRepos(query = "", per_page = 25) {
        let repos;

        try {
            if (query) {
                // Search for repositories matching the query
                const { data } = await this.octokit.search.repos({
                    q: `${query} user:${this.owner}`,
                    per_page,
                });
                return data; // Already has items and total_count
            } else {
                try {
                    const { data } = await this.octokit.rest.apps.listReposAccessibleToInstallation(
                        {
                            per_page,
                        }
                    );

                    console.log(`Found ${data.total_count} repos accessible to installation`);

                    // Format response to match search API
                    return {
                        items: data.repositories,
                        total_count: data.total_count,
                    };
                } catch (err) {
                    console.error(
                        "Falling back to listInstallationRepositoriesForAuthenticatedUser"
                    );
                    const { data } =
                        await this.octokit.apps.listInstallationReposForAuthenticatedUser({
                            per_page,
                            installation_id: Number(process.env.GITHUB_INSTALLATION_ID),
                        });

                    return {
                        items: data.repositories,
                        total_count: data.total_count,
                    };
                }
            }
        } catch (error) {
            console.error("Error listing repositories:", error);
            return { items: [], total_count: 0 };
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

    async validateRateLimit() {
        try {
            const { data: rateLimit } = await this.octokit.rateLimit.get();
            if (this.debug) {
                console.log(
                    `Current rate limit status: ${rateLimit.resources.core.remaining}/${rateLimit.resources.core.limit} calls remaining`
                );
            }

            if (rateLimit.resources.core.remaining < this.rateLimitWarningThreshold) {
                console.warn(
                    `GitHub API rate limit warning: ${rateLimit.resources.core.remaining} calls remaining`
                );
                return false;
            }
            return true;
        } catch (error) {
            if (this.debug) console.error("Failed to check rate limit:", error);
            // Continue despite rate limit check failure
            return true;
        }
    }

    async readFile(owner: string, repo: string, ref: string = "main", path: string) {
        await this.validateRateLimit();

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
