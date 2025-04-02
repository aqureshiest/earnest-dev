import { RepositoryDataService } from "@/modules/db/RepositoryDataService";
import { CodeGenCloudWatchService } from "@/modules/metrics/retrieve/CodeGenCloudWatchService";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const dataService = new RepositoryDataService();

        // Get the list of repositories
        const repositories = await dataService.getRepositories();

        const cloudWatch = new CodeGenCloudWatchService(repositories);

        // Get the current date for time series data
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 30); // Last 30 days

        // Fetch core metrics
        const codeGenMetrics = await cloudWatch.getAllMetrics(startDate, endDate);

        // Get time series data for various metrics
        const [requestsOverTime, successRateOverTime, linesOfCodeOverTime, prsCreatedOverTime] =
            await Promise.all([
                cloudWatch.getRequestsOverTime(startDate, endDate),
                cloudWatch.getSuccessRateOverTime(startDate, endDate),
                cloudWatch.getLinesOfCodeOverTime(startDate, endDate),
                cloudWatch.getPRsCreatedOverTime(startDate, endDate),
            ]);

        // Format time series data for easier consumption by frontend
        const formatTimeSeriesData = (data: any) => {
            if (!data.timestamps || !data.values || data.timestamps.length === 0) {
                return [];
            }

            return data.timestamps.map((timestamp: any, index: any) => ({
                date: timestamp.toISOString().split("T")[0], // Format as YYYY-MM-DD
                value: data.values[index] || 0,
            }));
        };

        return NextResponse.json({
            // Summary metrics
            totalRequests: codeGenMetrics.totalRequests,
            successRate: codeGenMetrics.successRate,
            prsCreated: codeGenMetrics.prsCreated,
            linesOfCode: codeGenMetrics.linesOfCode,

            // Token usage
            tokenUsage: codeGenMetrics.tokenUsage,

            // Repository list
            repositories: codeGenMetrics.repositories,

            // Time series data
            timeSeriesData: {
                requestsOverTime: formatTimeSeriesData(requestsOverTime),
                successRateOverTime: formatTimeSeriesData(successRateOverTime),
                linesOfCodeOverTime: formatTimeSeriesData(linesOfCodeOverTime),
                prsCreatedOverTime: formatTimeSeriesData(prsCreatedOverTime),
            },
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
