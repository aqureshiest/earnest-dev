import {
    CloudWatchClient,
    GetMetricDataCommand,
    GetMetricStatisticsCommand,
} from "@aws-sdk/client-cloudwatch";

// Initialize CloudWatch client
const cloudWatchClient = new CloudWatchClient({
    region: process.env.AWS_REGION || "us-east-1",
});

// Add this interface to the file (or import it if defined elsewhere)
export interface PRDMetricsStats {
    requestCount: number;
    successRate: number;
    averageDuration: number;
    featureCount: number;
    screenCount: number;
    wordCount: number;
    tokenUsage: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
        tokenCost: number;
    };
}

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

    private async getPRDMetricSum(
        metricName: string,
        timeRange: { startTime: Date; endTime: Date } = this.getDefaultTimeRange()
    ): Promise<number> {
        const { startTime, endTime } = timeRange;

        try {
            const command = new GetMetricStatisticsCommand({
                Namespace: NAMESPACE,
                MetricName: metricName,
                StartTime: startTime,
                EndTime: endTime,
                Period: 86400, // 1 day aggregation
                Statistics: ["Sum"],
            });

            const response = await cloudWatchClient.send(command);

            let totalSum = 0;
            if (response.Datapoints) {
                for (const datapoint of response.Datapoints) {
                    if (datapoint.Sum !== undefined) {
                        totalSum += datapoint.Sum;
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

    // PRD metrics retrieval methods
    async getPRDRequestCount(): Promise<number> {
        return this.getPRDMetricSum("PRD_Requests");
    }

    async getPRDSuccessRate(): Promise<number> {
        const timeRange = this.getDefaultTimeRange();
        const totalRequests = await this.getPRDMetricSum("PRD_Requests", timeRange);
        const totalSuccesses = await this.getPRDMetricSum("PRD_Success", timeRange);

        // Calculate success rate percentage
        if (totalRequests === 0) {
            return 0;
        }

        return (totalSuccesses / totalRequests) * 100;
    }

    async getPRDAverageDuration(): Promise<number> {
        // For average duration, we need to use Average statistic instead of Sum
        const { startTime, endTime } = this.getDefaultTimeRange();

        try {
            const command = new GetMetricStatisticsCommand({
                Namespace: NAMESPACE,
                MetricName: "PRD_Duration",
                StartTime: startTime,
                EndTime: endTime,
                Period: 86400, // 1 day aggregation
                Statistics: ["Average"],
            });

            const response = await cloudWatchClient.send(command);

            if (!response.Datapoints || response.Datapoints.length === 0) {
                return 0;
            }

            // Calculate the average of all daily averages
            let totalAverage = 0;
            for (const datapoint of response.Datapoints) {
                if (datapoint.Average !== undefined) {
                    totalAverage += datapoint.Average;
                }
            }

            return totalAverage / response.Datapoints.length;
        } catch (error) {
            console.error("Error fetching PRD_Duration metrics:", error);
            throw error;
        }
    }

    async getPRDFeatureCount(): Promise<number> {
        return this.getPRDMetricSum("PRD_FeatureCount");
    }

    async getPRDScreenCount(): Promise<number> {
        return this.getPRDMetricSum("PRD_ScreenCount");
    }

    async getPRDWordCount(): Promise<number> {
        return this.getPRDMetricSum("PRD_WordCount");
    }

    async getPRDTokenUsage(): Promise<{
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
        tokenCost: number;
    }> {
        const timeRange = this.getDefaultTimeRange();

        const [inputTokens, outputTokens, totalTokens, tokenCost] = await Promise.all([
            this.getPRDMetricSum("PRD_InputTokens", timeRange),
            this.getPRDMetricSum("PRD_OutputTokens", timeRange),
            this.getPRDMetricSum("PRD_TotalTokens", timeRange),
            this.getPRDMetricSum("PRD_TokenCost", timeRange),
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

    // method to get all PRD metrics at once
    async getAllPRDMetrics(): Promise<PRDMetricsStats> {
        const timeRange = this.getDefaultTimeRange();

        const [
            requestCount,
            successRate,
            averageDuration,
            featureCount,
            screenCount,
            wordCount,
            tokenUsage,
        ] = await Promise.all([
            this.getPRDRequestCount(),
            this.getPRDSuccessRate(),
            this.getPRDAverageDuration(),
            this.getPRDFeatureCount(),
            this.getPRDScreenCount(),
            this.getPRDWordCount(),
            this.getPRDTokenUsage(),
        ]);

        return {
            requestCount,
            successRate,
            averageDuration,
            featureCount,
            screenCount,
            wordCount,
            tokenUsage,
        };
    }

    // Get PRD metrics data for time series visualization
    async getPRDRequestsOverTime(startTime: Date, endTime: Date): Promise<MetricDataResult> {
        const command = new GetMetricDataCommand({
            StartTime: startTime,
            EndTime: endTime,
            ScanBy: "TimestampDescending",
            MetricDataQueries: [
                {
                    Id: "prdRequests",
                    MetricStat: {
                        Metric: {
                            Namespace: NAMESPACE,
                            MetricName: "PRD_Requests",
                        },
                        Period: 86400, // 1 day aggregation
                        Stat: "Sum",
                    },
                    Label: "PRD Requests Over Time",
                    ReturnData: true,
                },
            ],
        });

        try {
            const response = await cloudWatchClient.send(command);

            if (!response.MetricDataResults || response.MetricDataResults.length === 0) {
                return { label: "PRD Requests Over Time", values: [], timestamps: [] };
            }

            const result = response.MetricDataResults[0];

            return {
                label: result.Label || "PRD Requests Over Time",
                values: result.Values || [],
                timestamps: result.Timestamps || [],
            };
        } catch (error) {
            console.error("Error fetching PRD requests over time:", error);
            throw error;
        }
    }

    // Get PRD feature count over time
    async getPRDFeatureCountOverTime(startTime: Date, endTime: Date): Promise<MetricDataResult> {
        const command = new GetMetricDataCommand({
            StartTime: startTime,
            EndTime: endTime,
            ScanBy: "TimestampDescending",
            MetricDataQueries: [
                {
                    Id: "prdFeatureCount",
                    MetricStat: {
                        Metric: {
                            Namespace: NAMESPACE,
                            MetricName: "PRD_FeatureCount",
                        },
                        Period: 86400, // 1 day aggregation
                        Stat: "Sum",
                    },
                    Label: "PRD Feature Count Over Time",
                    ReturnData: true,
                },
            ],
        });

        try {
            const response = await cloudWatchClient.send(command);

            if (!response.MetricDataResults || response.MetricDataResults.length === 0) {
                return { label: "PRD Feature Count Over Time", values: [], timestamps: [] };
            }

            const result = response.MetricDataResults[0];

            return {
                label: result.Label || "PRD Feature Count Over Time",
                values: result.Values || [],
                timestamps: result.Timestamps || [],
            };
        } catch (error) {
            console.error("Error fetching PRD feature count over time:", error);
            throw error;
        }
    }
}
