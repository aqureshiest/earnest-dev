import { PRDCloudWatchService } from "@/modules/metrics/retrieve/PRDCloudWatchService";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const cloudWatch = new PRDCloudWatchService();

        // Get the current date for time series data
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 30); // Last 30 days

        const [prdMetrics, timeSeriesData] = await Promise.all([
            cloudWatch.getAllPRDMetrics(),
            cloudWatch.getPRDTimeSeriesData(startDate, endDate),
        ]);

        return NextResponse.json({
            ...prdMetrics,
            timeSeriesData,
        });
    } catch (error) {
        console.error("Error fetching PRD metrics:", error);
        return NextResponse.json(
            {
                error: `Failed to fetch PRD metrics data: ${
                    error instanceof Error ? error.message : String(error)
                }`,
            },
            { status: 500 }
        );
    }
}
