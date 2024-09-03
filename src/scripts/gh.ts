import { GitHubService } from "@/modules/github/GitHubService";
import { GithubDataFetcher } from "@/modules/github/GitHubStatsService";
import { loadEnvConfig } from "@next/env";

loadEnvConfig("");

const owner = "BuilderIO";
const repo = "micro-agent";
const since = "2024-08-01T00:00:00Z"; // Fetch data since this date

const ghService = new GitHubService();
const dataFetcher = new GithubDataFetcher(ghService);

async function fetchAndDisplayData() {
    try {
        console.log("Fetching repository data...");
        const repoData = await dataFetcher.fetchRepositoryData(owner, repo, since);
        console.log("Repository Data:", JSON.stringify(repoData, null, 2));

        console.log("\nFetching user data...");
        const userData = await dataFetcher.fetchUserData("example-user", since);
        console.log("User Data:", JSON.stringify(userData, null, 2));

        console.log("\nFetching team data...");
        const teamData = await dataFetcher.fetchTeamData(owner, repo, since);
        console.log("Team Data:", JSON.stringify(teamData, null, 2));

        // Example of using the data for simple analysis
        console.log("\nSimple Analysis:");
        console.log(`Total commits: ${repoData.commits.length}`);
        console.log(`Total pull requests: ${repoData.pullRequests.length}`);
        console.log(`Average PR size: ${calculateAveragePRSize(repoData.pullRequests)} changes`);
        console.log(`Most active contributor: ${findMostActiveContributor(teamData.users)}`);
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

function calculateAveragePRSize(pullRequests: any[]): number {
    const totalChanges = pullRequests.reduce((sum, pr) => sum + pr.additions + pr.deletions, 0);
    return Math.round(totalChanges / pullRequests.length);
}

function findMostActiveContributor(users: any[]): string {
    return users.reduce((most, user) => (user.commits > most.commits ? user : most)).login;
}

// Run the script
fetchAndDisplayData();
