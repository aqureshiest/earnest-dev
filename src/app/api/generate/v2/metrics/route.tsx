import { RepositoryDataService } from "@/modules/db/RepositoryDataService";
import { CloudWatchService } from "@/modules/utils/metrics/cloudwatch";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const dataService = new RepositoryDataService();

        // Get the list of repositories
        const repositories = await dataService.getRepositories();
        console.log("Repositories:", repositories);

        const cloudWatch = new CloudWatchService(repositories);

        // Fetch all metrics in parallel for better performance
        const [totalRequests, successRate, prsCreated, linesOfCode, tokenUsage] = await Promise.all(
            [
                cloudWatch.getTotalRequestsSum(),
                cloudWatch.getSuccessRate(),
                cloudWatch.getPRsCreated(),
                cloudWatch.getLinesOfCode(),
                cloudWatch.getTokenUsage(),
            ]
        );

        return NextResponse.json({
            totalRequests,
            successRate,
            prsCreated,
            linesOfCode,
            inputTokens: tokenUsage.inputTokens,
            outputTokens: tokenUsage.outputTokens,
            totalTokens: tokenUsage.totalTokens,
            tokenCost: tokenUsage.tokenCost,
            repositories,
        });
    } catch (error) {
        console.error("Error fetching metrics:", error);
        return NextResponse.json(
            {
                error: `Failed to fetch metrics data: ${
                    error instanceof Error ? error.message : String(error)
                }`,
            },
            { status: 500 }
        );
    }
}
