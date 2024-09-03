import { GitHubService } from "./GitHubService";
import fs from "fs/promises";
import path from "path";

export class GithubDataFetcher {
    private cacheDir: string;
    private cacheTTL: number; // cache time-to-live in milliseconds

    constructor(private githubService: GitHubService, cacheDir: string = "./.cache") {
        this.cacheDir = cacheDir;
        this.cacheTTL = 24 * 60 * 60 * 1000; // 24 hours
    }

    async fetchRepositoryData(owner: string, repo: string, since: string): Promise<RepositoryData> {
        const [commits, pullRequests] = await Promise.all([
            this.githubService.getCommits(owner, repo, since),
            this.githubService.getPullRequests(owner, repo, "all", since),
        ]);

        const commitData: CommitData[] = await Promise.all(
            commits.map(async (commit) => {
                const details = await this.githubService.getCommit(owner, repo, commit.sha);
                return {
                    sha: commit.sha,
                    date: commit.commit.author?.date || "",
                    author: (commit.author?.login ?? commit.commit.author?.name) || "",
                    additions: details.stats?.additions || 0,
                    deletions: details.stats?.deletions || 0,
                    files_changed: details.files?.map((file) => file.filename) || [],
                };
            })
        );

        const prData: PullRequestData[] = await Promise.all(
            pullRequests.map(async (pr) => {
                const [detailedPR, reviews] = await Promise.all([
                    this.githubService.getPullRequest(owner, repo, pr.number),
                    this.githubService.getPullRequestReviews(owner, repo, pr.number),
                ]);

                const firstReview = reviews.length > 0 ? reviews[0].submitted_at! : null;
                const timeToFirstReview = firstReview
                    ? this.calculateTimeDifference(detailedPR.created_at, firstReview)
                    : null;
                const timeToMerge = detailedPR.merged_at
                    ? this.calculateTimeDifference(detailedPR.created_at, detailedPR.merged_at)
                    : null;

                return {
                    number: detailedPR.number,
                    author: detailedPR.user.login,
                    created_at: detailedPR.created_at,
                    merged_at: detailedPR.merged_at,
                    closed_at: detailedPR.closed_at,
                    first_review_at: firstReview,
                    time_to_first_review: timeToFirstReview,
                    time_to_merge: timeToMerge,
                    changed_files: detailedPR.changed_files,
                    additions: detailedPR.additions,
                    deletions: detailedPR.deletions,
                    reviewers: reviews.map((review) => review.user.login),
                    review_comments: detailedPR.review_comments,
                    labels: detailedPR.labels.map((label) => label.name),
                };
            })
        );

        const reviewData: ReviewData[] = (
            await Promise.all(
                pullRequests.map((pr) =>
                    this.githubService.getPullRequestReviews(owner, repo, pr.number)
                )
            )
        )
            .flat()
            .map((review) => ({
                pull_request_number: review.pull_request_number,
                reviewer: review.user.login,
                submitted_at: review.submitted_at || "",
                comments: review.comments,
                lines_reviewed: this.estimateLinesReviewed(review),
            }));

        const commitFrequency = this.calculateFrequencyOverTime(commitData.map((c) => c.date));
        const prMergeFrequency = this.calculateFrequencyOverTime(
            prData.filter((pr) => pr.merged_at).map((pr) => pr.merged_at!)
        );

        return {
            name: repo,
            commits: commitData,
            pullRequests: prData,
            reviews: reviewData,
            commit_frequency: commitFrequency,
            pr_merge_frequency: prMergeFrequency,
        };
    }

    async fetchUserData(username: string, since: string): Promise<UserData> {
        const [commits, pullRequests, reviews] = await Promise.all([
            this.githubService.getUserCommits(username, since),
            this.githubService.getUserPullRequests(username, "all", since),
            this.githubService.getUserReviews(username, since),
        ]);

        const averagePRSize = this.calculateAveragePRSize(pullRequests);
        const averageTimeToReview = this.calculateAverageTimeToReview(reviews);
        const favoriteFiles = this.calculateFavoriteFiles(commits);

        return {
            login: username,
            commits: commits.length,
            pullRequestsOpened: pullRequests.length,
            pullRequestsReviewed: reviews.length,
            averagePRSize,
            averageTimeToReview,
            favoriteFiles,
        };
    }

    async fetchTeamData(owner: string, repo: string, since: string): Promise<TeamData> {
        const cacheKey = `team_data_${owner}_${repo}`;
        const cachedData = await this.getCache(cacheKey);
        if (cachedData) {
            console.log("Returning cached team data");
            return cachedData as TeamData;
        }

        const contributors = await this.githubService.getRepositoryContributors(owner, repo);
        const userData: UserData[] = [];

        // Process only the top 20 contributors to reduce API calls
        const topContributors = contributors.slice(0, 20);

        // Process contributors one at a time with longer delays
        for (const contributor of topContributors) {
            try {
                const data = await this.fetchUserDataWithRetry(contributor.login!, since);
                userData.push(data);
                await this.delay(5000); // 5 second delay between each user
            } catch (error) {
                console.error(`Failed to fetch data for user ${contributor.login}:`, error);
            }
        }

        const collaborationMatrix = await this.calculateCollaborationMatrix(
            userData,
            owner,
            repo,
            since
        );
        const teamVelocity = this.calculateTeamVelocity(userData);
        const workDistribution = this.calculateWorkDistribution(userData);

        const teamData: TeamData = {
            users: userData,
            collaborationMatrix,
            teamVelocity,
            workDistribution,
        };

        await this.setCache(cacheKey, teamData);
        return teamData;
    }

    private async fetchUserDataWithRetry(
        username: string,
        since: string,
        maxRetries = 3
    ): Promise<UserData> {
        const cacheKey = `user_data_${username}`;
        const cachedData = await this.getCache(cacheKey);
        if (cachedData) {
            console.log(`Returning cached data for user ${username}`);
            return cachedData as UserData;
        }

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const userData = await this.fetchUserData(username, since);
                await this.setCache(cacheKey, userData);
                return userData;
            } catch (error) {
                if (attempt === maxRetries) throw error;
                const delay = Math.pow(2, attempt) * 2000; // Increased exponential backoff
                await this.delay(delay);
            }
        }
        throw new Error(`Failed to fetch user data for ${username} after ${maxRetries} attempts`);
    }

    private async calculateCollaborationMatrix(
        userData: UserData[],
        owner: string,
        repo: string,
        since: string
    ): Promise<{ [reviewer: string]: { [author: string]: number } }> {
        const cacheKey = `collab_matrix_${owner}_${repo}`;
        const cachedData = await this.getCache(cacheKey);
        if (cachedData) {
            console.log("Returning cached collaboration matrix");
            return cachedData as { [reviewer: string]: { [author: string]: number } };
        }

        const matrix: { [reviewer: string]: { [author: string]: number } } = {};

        for (const user of userData) {
            matrix[user.login] = {};
            const reviews = await this.githubService.getUserReviews(user.login, since);

            for (const review of reviews) {
                const prAuthor = await this.getPullRequestAuthor(
                    owner,
                    repo,
                    review.pull_request_url!
                );
                if (prAuthor && prAuthor !== user.login) {
                    matrix[user.login][prAuthor] = (matrix[user.login][prAuthor] || 0) + 1;
                }
            }

            await this.delay(5000); // 5 second delay between each user
        }

        await this.setCache(cacheKey, matrix);
        return matrix;
    }

    private async getPullRequestAuthor(
        owner: string,
        repo: string,
        pullRequestUrl: string
    ): Promise<string | null> {
        const pullNumber = parseInt(pullRequestUrl.split("/").pop() || "");
        if (isNaN(pullNumber)) return null;

        const cacheKey = `pr_author_${owner}_${repo}_${pullNumber}`;
        const cachedData = await this.getCache(cacheKey);
        if (cachedData) return cachedData as string;

        try {
            const pr = await this.githubService.getPullRequest(owner, repo, pullNumber);
            await this.setCache(cacheKey, pr.user.login);
            return pr.user.login;
        } catch (error) {
            console.error(`Failed to fetch PR author for ${pullRequestUrl}:`, error);
            return null;
        }
    }

    private async getCache(key: string): Promise<any | null> {
        try {
            const cacheFile = path.join(this.cacheDir, `${key}.json`);
            const data = await fs.readFile(cacheFile, "utf8");
            const cacheData: CacheData = JSON.parse(data);
            if (Date.now() - cacheData.timestamp < this.cacheTTL) {
                return cacheData.data;
            }
        } catch (error) {
            // Cache miss or expired, return null
        }
        return null;
    }

    private async setCache(key: string, data: any): Promise<void> {
        try {
            await fs.mkdir(this.cacheDir, { recursive: true });
            const cacheFile = path.join(this.cacheDir, `${key}.json`);
            const cacheData: CacheData = {
                timestamp: Date.now(),
                data: data,
            };
            await fs.writeFile(cacheFile, JSON.stringify(cacheData));
        } catch (error) {
            console.error("Failed to write cache:", error);
        }
    }

    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    private calculateTimeDifference(start: string, end: string): number {
        return (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60); // Time difference in hours
    }

    private estimateLinesReviewed(review: any): number {
        // This is a placeholder. In a real implementation, you'd need to fetch the PR diff and analyze it.
        return review.comments * 10; // Rough estimate: 10 lines per comment
    }

    private calculateFrequencyOverTime(dates: string[]): { date: string; count: number }[] {
        // Implement logic to group dates by day/week and count occurrences
        // This is a simplified version
        const frequency: { [date: string]: number } = {};
        dates.forEach((date) => {
            const day = date.split("T")[0];
            frequency[day] = (frequency[day] || 0) + 1;
        });
        return Object.entries(frequency).map(([date, count]) => ({ date, count }));
    }

    private calculateAveragePRSize(pullRequests: any[]): number {
        const totalChanges = pullRequests.reduce((sum, pr) => sum + pr.additions + pr.deletions, 0);
        return totalChanges / pullRequests.length;
    }

    private calculateAverageTimeToReview(reviews: any[]): number {
        // Implement logic to calculate average time between PR creation and review submission
        // This would require additional data fetching for PR creation times
        return 0; // Placeholder
    }

    private calculateFavoriteFiles(commits: any[]): { file: string; frequency: number }[] {
        // Implement logic to count file occurrences in commits and sort by frequency
        // This would require additional data fetching for file changes in each commit
        return []; // Placeholder
    }

    private calculateTeamVelocity(userData: UserData[]): number {
        // Implement logic to calculate team velocity (e.g., PRs merged per week)
        return userData.reduce((sum, user) => sum + user.pullRequestsOpened, 0) / 4; // Assuming 4 weeks
    }

    private calculateWorkDistribution(userData: UserData[]): { [user: string]: number } {
        const totalWork = userData.reduce(
            (sum, user) => sum + user.commits + user.pullRequestsOpened + user.pullRequestsReviewed,
            0
        );
        return userData.reduce((dist, user) => {
            dist[user.login] =
                (user.commits + user.pullRequestsOpened + user.pullRequestsReviewed) / totalWork;
            return dist;
        }, {} as { [user: string]: number });
    }
}
