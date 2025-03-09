import { CloudWatchService, MetricDataResult } from "@/modules/utils/cloudwatch";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const cloudWatch = new CloudWatchService([]);

        // Get the current date for time series data
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 30); // Last 30 days

        // Fetch all PRD metrics in parallel for better performance
        const [prdMetrics, requestsOverTime, featureCountOverTime] = await Promise.all([
            cloudWatch.getAllPRDMetrics(),
            cloudWatch.getPRDRequestsOverTime(startDate, endDate),
            cloudWatch.getPRDFeatureCountOverTime(startDate, endDate),
        ]);

        // Format time series data for easier consumption by frontend
        const formatTimeSeriesData = (data: MetricDataResult) => {
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
            requestCount: prdMetrics.requestCount,
            successRate: prdMetrics.successRate,
            averageDuration: prdMetrics.averageDuration,
            featureCount: prdMetrics.featureCount,
            screenCount: prdMetrics.screenCount,
            wordCount: prdMetrics.wordCount,

            // Token usage
            tokenUsage: prdMetrics.tokenUsage,

            // Time series data
            timeSeriesData: {
                requestsOverTime: formatTimeSeriesData(requestsOverTime),
                featureCountOverTime: formatTimeSeriesData(featureCountOverTime),
            },
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
