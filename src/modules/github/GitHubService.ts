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
        const { data: files } = await this.octokit.repos.getContent({
            owner,
            repo,
            ref,
            path,
        });

        return Array.isArray(files) ? files : [files];
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
}
