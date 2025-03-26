import { RepositoryDataService } from "@/modules/db/RepositoryDataService";
import { CodebaseQACloudWatchService } from "@/modules/metrics/retrieve/CodebaseQACloudWatchService";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const dataService = new RepositoryDataService();

        // Get the list of repositories
        const repositories = await dataService.getRepositories();
        console.log(repositories);

        const cloudWatch = new CodebaseQACloudWatchService(repositories);

        // Get the current date for time series data
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 30); // Last 30 days

        const [qaMetrics, timeSeriesData] = await Promise.all([
            cloudWatch.getAllQAMetrics(startDate, endDate),
            cloudWatch.getQATimeSeriesData(startDate, endDate),
        ]);

        return NextResponse.json({
            ...qaMetrics,
            timeSeriesData,
            repositories,
        });
    } catch (error) {
        console.error("Error fetching QA metrics:", error);
        return NextResponse.json(
            {
                error: `Failed to fetch QA metrics data: ${
                    error instanceof Error ? error.message : String(error)
                }`,
            },
            { status: 500 }
        );
    }
}
