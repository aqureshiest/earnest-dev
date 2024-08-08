import { Octokit } from "@octokit/rest";

export class GitHubService {
    private octokit: Octokit;

    constructor() {
        this.octokit = new Octokit({
            auth: process.env.GITHUB_TOKEN,
        });
    }

    async listRepos() {
        const { data: repos } = await this.octokit.repos.listForAuthenticatedUser({
            visibility: "all",
        });

        return repos;
    }

    async listBranches(owner: string, repo: string) {
        const { data: branches } = await this.octokit.repos.listBranches({
            owner,
            repo,
        });

        return branches;
    }

    async getRepos(page: number = 1, per_page: number = 100) {
        const { data: repos } = await this.octokit.repos.listForAuthenticatedUser({
            visibility: "all",
            page,
            per_page,
        });

        return repos;
    }

    async getBranch(owner: string, repo: string, ref: string = "main") {
        const { data: branch } = await this.octokit.repos.getBranch({
            owner,
            repo,
            branch: ref,
        });

        return branch;
    }

    async getFiles(owner: string, repo: string, ref: string = "main", path: string = "") {
        const { data: files } = await this.getContent(owner, repo, ref, path);
        return Array.isArray(files) ? files : [files];
    }

    async readFile(owner: string, repo: string, ref: string = "main", path: string) {
        const { data: content } = await this.getContent(owner, repo, ref, path);
        return content;
    }

    private async getContent(owner: string, repo: string, ref: string, path: string): Promise<any> {
        const maxRetries = 3;
        const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const { data: content } = await this.octokit.repos.getContent({
                    owner,
                    repo,
                    ref,
                    path,
                });

                return content;
            } catch (error: any) {
                if (error.status === 403) {
                    const backoffDelay = Math.pow(2, attempt) * 1000; // Exponential backoff
                    await delay(backoffDelay);
                } else {
                    throw error; // Re-throw if it's not a 403 error
                }
            }
        }

        throw new Error(`Failed to fetch content from GitHub after ${maxRetries} attempts.`);
    }
}
