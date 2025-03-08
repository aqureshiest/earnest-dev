import {
    CloudWatchClient,
    GetMetricDataCommand,
    GetMetricStatisticsCommand,
} from "@aws-sdk/client-cloudwatch";

// Initialize CloudWatch client
const cloudWatchClient = new CloudWatchClient({
    region: process.env.AWS_REGION || "us-east-1",
});

const NAMESPACE = "EarnestAI/CodeGenerator";

export interface MetricDataResult {
    label: string;
    values: number[];
    timestamps: Date[];
}

export class CloudWatchService {
    constructor(private repositories: string[]) {}

    async getTotalRequests(startTime: Date, endTime: Date): Promise<MetricDataResult> {
        const command = new GetMetricDataCommand({
            StartTime: startTime,
            EndTime: endTime,
            ScanBy: "TimestampDescending",
            MetricDataQueries: [
                {
                    Id: "totalRequests",
                    Expression:
                        "SUM(SEARCH('{EarnestAI/CodeGenerator,Repository} MetricName=\"Requests\"', 'Sum'))",
                    Label: "Total Requests",
                    Period: 3600, // 1 hour aggregation
                    ReturnData: true,
                },
            ],
        });

        try {
            const response = await cloudWatchClient.send(command);

            if (!response.MetricDataResults || response.MetricDataResults.length === 0) {
                return { label: "Total Requests", values: [], timestamps: [] };
            }

            const result = response.MetricDataResults[0];

            return {
                label: result.Label || "Total Requests",
                values: result.Values || [],
                timestamps: result.Timestamps || [],
            };
        } catch (error) {
            console.error("Error fetching CloudWatch metrics:", error);
            throw error;
        }
    }

    private async getMetricSum(
        metricName: string,
        timeRange: { startTime: Date; endTime: Date } = this.getDefaultTimeRange()
    ): Promise<number> {
        const { startTime, endTime } = timeRange;

        try {
            let totalSum = 0;

            // Sum up metric across all repositories
            for (const repo of this.repositories) {
                const command = new GetMetricStatisticsCommand({
                    Namespace: NAMESPACE,
                    MetricName: metricName,
                    Dimensions: [
                        {
                            Name: "Repository",
                            Value: repo,
                        },
                    ],
                    StartTime: startTime,
                    EndTime: endTime,
                    Period: 86400, // 1 day aggregation
                    Statistics: ["Sum"],
                });

                const response = await cloudWatchClient.send(command);

                if (response.Datapoints) {
                    for (const datapoint of response.Datapoints) {
                        if (datapoint.Sum !== undefined) {
                            totalSum += datapoint.Sum;
                        }
                    }
                }
            }

            return totalSum;
        } catch (error) {
            console.error(`Error fetching ${metricName} metrics:`, error);
            throw error;
        }
    }

    private getDefaultTimeRange(): { startTime: Date; endTime: Date } {
        const endTime = new Date();
        const startTime = new Date();
        startTime.setDate(startTime.getDate() - 30);
        return { startTime, endTime };
    }

    async getTotalRequestsSum(): Promise<number> {
        return this.getMetricSum("Requests");
    }

    async getSuccessRate(): Promise<number> {
        const timeRange = this.getDefaultTimeRange();
        const totalRequests = await this.getMetricSum("Requests", timeRange);
        const totalSuccesses = await this.getMetricSum("Success", timeRange);

        // Calculate success rate percentage
        if (totalRequests === 0) {
            return 0;
        }

        return (totalSuccesses / totalRequests) * 100;
    }

    async getPRsCreated(): Promise<number> {
        return this.getMetricSum("PRsCreated");
    }

    async getLinesOfCode(): Promise<number> {
        return this.getMetricSum("LinesOfCode");
    }

    async getTokenUsage(): Promise<{
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
        tokenCost: number;
    }> {
        const timeRange = this.getDefaultTimeRange();

        const [inputTokens, outputTokens, totalTokens, tokenCost] = await Promise.all([
            this.getMetricSum("InputTokens", timeRange),
            this.getMetricSum("OutputTokens", timeRange),
            this.getMetricSum("TotalTokens", timeRange),
            this.getMetricSum("TokenCost", timeRange),
        ]);

        // If we have input and output tokens but not total (unlikely), calculate the total
        const calculatedTotal =
            totalTokens === 0 && (inputTokens > 0 || outputTokens > 0)
                ? inputTokens + outputTokens
                : totalTokens;

        return {
            inputTokens,
            outputTokens,
            totalTokens: calculatedTotal,
            tokenCost,
        };
    }
}
