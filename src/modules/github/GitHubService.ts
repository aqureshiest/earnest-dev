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

    async getBranches(owner: string, repo: string) {
        const { data: branches } = await this.octokit.repos.listBranches({
            owner,
            repo,
        });

        return branches;
    }

    async getBranchCommit(owner: string, repo: string, branch: string) {
        const { data: branchData } = await this.octokit.repos.getBranch({
            owner,
            repo,
            branch,
        });

        return branchData.commit.sha;
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

    async getPrimaryLanguage(owner: string, repo: string) {
        try {
            const { data: languages } = await this.octokit.repos.listLanguages({
                owner,
                repo,
            });
            console.log(languages);

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

    async getCommits(owner: string, repo: string, ref: string = "main") {
        const { data: commits } = await this.octokit.repos.listCommits({
            owner,
            repo,
            ref,
        });

        return commits;
    }

    async getPullRequests(
        owner: string,
        repo: string,
        state: "open" | "closed" | "all",
        since: string
    ) {
        const { data: pullRequests } = await this.octokit.pulls.list({
            owner,
            repo,
            state,
            since,
        });

        return pullRequests;
    }

    async getReleases(owner: string, repo: string) {
        const { data: releases } = await this.octokit.repos.listReleases({
            owner,
            repo,
        });

        return releases;
    }

    async getCommit(owner: string, repo: string, sha: string) {
        const { data: commit } = await this.octokit.repos.getCommit({
            owner,
            repo,
            ref: sha,
        });

        return commit;
    }

    async getPullRequest(owner: string, repo: string, pullNumber: number) {
        const { data: pullRequest } = await this.octokit.pulls.get({
            owner,
            repo,
            pull_number: pullNumber,
        });

        return pullRequest;
    }

    async getPullRequestReviews(owner: string, repo: string, pullNumber: number) {
        const reviews = await this.octokit.paginate(this.octokit.pulls.listReviews, {
            owner,
            repo,
            pull_number: pullNumber,
            per_page: 50,
        });

        return reviews.map((review) => ({
            id: review.id,
            user: { login: review.user?.login || "" },
            body: review.body,
            state: review.state,
            submitted_at: review.submitted_at,
            pull_request_number: pullNumber, // Added this field
            comments: 0,
        }));
    }

    async getUserCommits(username: string, since: string) {
        const commits = await this.octokit.paginate(this.octokit.search.commits, {
            q: `author:${username} committer-date:>${since}`,
            sort: "committer-date",
            order: "desc",
            per_page: 50,
        });

        const commitsMapped = commits.map((item) => ({
            sha: item.sha,
            commit: {
                author: item.commit.author,
                message: item.commit.message,
            },
            author: item.author,
            repo: {
                name: item.repository.name,
            },
        }));

        return commitsMapped;
    }

    async getUserPullRequests(username: string, state: "open" | "closed" | "all", since: string) {
        const pullRequests = await this.octokit.paginate(
            this.octokit.search.issuesAndPullRequests,
            {
                q: `type:pr author:${username} created:>${since}`,
                sort: "created",
                order: "desc",
                per_page: 50,
            }
        );

        return pullRequests
            .filter((item) => item.pull_request) // Ensure it's a pull request
            .map((pr) => ({
                number: pr.number,
                state: pr.state,
                title: pr.title,
                created_at: pr.created_at,
                updated_at: pr.updated_at,
                closed_at: pr.closed_at,
                merged_at: pr.pull_request?.merged_at,
                user: {
                    login: pr.user?.login,
                },
                head: {
                    repo: {
                        name: pr.repository_url.split("/").pop() || "",
                    },
                },
            }));
    }

    async getUserReviews(username: string, since: string) {
        const reviews = await this.octokit.paginate(this.octokit.search.issuesAndPullRequests, {
            q: `type:pr reviewed-by:${username} updated:>${since}`,
            sort: "updated",
            order: "desc",
            per_page: 50,
        });

        const detailedReviews = await Promise.all(
            reviews.map(async (pr) => {
                const [owner, repo] = pr.repository_url.split("/").slice(-2);
                const prNumber = pr.number;
                const { data: prReviews } = await this.octokit.pulls.listReviews({
                    owner,
                    repo,
                    pull_number: prNumber,
                });

                return prReviews
                    .filter((review) => review.user?.login === username)
                    .map((review) => ({
                        id: review.id,
                        user: {
                            login: review.user?.login,
                        },
                        body: review.body,
                        state: review.state,
                        submitted_at: review.submitted_at,
                        pull_request_url: pr.pull_request?.url,
                        repository: {
                            name: repo,
                        },
                    }));
            })
        );

        return detailedReviews.flat();
    }

    async getRepositoryContributors(owner: string, repo: string) {
        const contributors = await this.octokit.paginate(this.octokit.repos.listContributors, {
            owner,
            repo,
            per_page: 50,
        });

        return contributors.map((contributor) => ({
            login: contributor.login,
            contributions: contributor.contributions,
        }));
    }
}
