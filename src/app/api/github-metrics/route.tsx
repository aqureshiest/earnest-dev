import { GitHubService } from "@/modules/github/GitHubService";
import { GithubDataFetcher } from "@/modules/github/GitHubStatsService";
import ProductivityMetrics from "@/modules/github/ProductivityMetrics";
import { NextResponse } from "next/server";

export async function GET() {
    const githubService = new GitHubService();
    const dataFetcher = new GithubDataFetcher(githubService);
    const metrics = new ProductivityMetrics();

    try {
        const owner = "BuilderIO";
        const repo = "micro-agent";

        // Fetch data for the last 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const repoData = await dataFetcher.fetchRepositoryData(owner, repo, thirtyDaysAgo);
        const teamData = await dataFetcher.fetchTeamData(owner, repo, thirtyDaysAgo);

        // Process the data
        const commitFrequency = metrics.calculateCommitFrequency(repoData.commits, "all", 30);
        const prMetrics = teamData.users.map((user) => ({
            developer: user.login,
            ...metrics.calculatePullRequestMetrics(repoData.pullRequests, user.login),
        }));
        const teamVelocity = metrics.calculateTeamVelocity(repoData.pullRequests, 30);
        const collaborationMatrix = teamData.collaborationMatrix;
        const prMergeFrequency = metrics.calculatePRMergeFrequencyOverTime(repoData.pullRequests);
        const averageCommentsPerPR = [
            {
                name: "Average Comments",
                value: metrics.calculateAverageCommentsPerPR(repoData.pullRequests),
            },
        ];
        const areasOfExpertise = metrics.identifyAreasOfExpertise(repoData.commits);

        const metricsData = {
            commitFrequency,
            prMetrics,
            teamVelocity,
            collaborationMatrix,
            prMergeFrequency,
            averageCommentsPerPR,
            areasOfExpertise,
        };

        return NextResponse.json(metricsData);
    } catch (error) {
        console.error("Error fetching GitHub metrics:", error);
        return NextResponse.json({ error: "Failed to fetch GitHub metrics" }, { status: 500 });
    }
}
