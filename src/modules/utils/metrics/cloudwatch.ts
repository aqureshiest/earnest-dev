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

    /**
     * Fetch the Total Requests metric data
     */
    async getTotalRequests(startTime: Date, endTime: Date): Promise<MetricDataResult> {
        const command = new GetMetricDataCommand({
            StartTime: startTime,
            EndTime: endTime,
            ScanBy: "TimestampDescending",
            MetricDataQueries: [
                {
                    Id: "totalRequests",
                    // For SEARCH expressions, we need to correctly structure the query
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

    /**
     * Get the sum of all requests using GetMetricStatistics instead of search expression
     * This is an alternative approach that might be more reliable
     */
    async getTotalRequestsSum(): Promise<number> {
        // Get data for the last 30 days
        const endTime = new Date();
        const startTime = new Date();
        startTime.setDate(startTime.getDate() - 30);

        try {
            // Using a more direct approach with GetMetricStatistics
            const repositories = this.repositories;
            let totalSum = 0;

            // Sum up requests across all repositories
            for (const repo of repositories) {
                const command = new GetMetricStatisticsCommand({
                    Namespace: NAMESPACE,
                    MetricName: "Requests",
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
            console.error("Error fetching CloudWatch metrics:", error);
            throw error;
        }
    }

    /**
     * Get Success Rate metric
     */
    async getSuccessRate(): Promise<number> {
        // Get data for the last 30 days
        const endTime = new Date();
        const startTime = new Date();
        startTime.setDate(startTime.getDate() - 30);

        try {
            const repositories = this.repositories;
            let totalRequests = 0;
            let totalSuccesses = 0;

            // Sum up requests and successes across all repositories
            for (const repo of repositories) {
                // Get request count
                const requestsCommand = new GetMetricStatisticsCommand({
                    Namespace: NAMESPACE,
                    MetricName: "Requests",
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

                const requestsResponse = await cloudWatchClient.send(requestsCommand);

                if (requestsResponse.Datapoints) {
                    for (const datapoint of requestsResponse.Datapoints) {
                        if (datapoint.Sum !== undefined) {
                            totalRequests += datapoint.Sum;
                        }
                    }
                }

                // Get success count
                const successCommand = new GetMetricStatisticsCommand({
                    Namespace: NAMESPACE,
                    MetricName: "Success",
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

                const successResponse = await cloudWatchClient.send(successCommand);

                if (successResponse.Datapoints) {
                    for (const datapoint of successResponse.Datapoints) {
                        if (datapoint.Sum !== undefined) {
                            totalSuccesses += datapoint.Sum;
                        }
                    }
                }
            }

            // Calculate success rate percentage
            if (totalRequests === 0) {
                return 0;
            }

            return (totalSuccesses / totalRequests) * 100;
        } catch (error) {
            console.error("Error fetching success rate metrics:", error);
            throw error;
        }
    }

    /**
     * Get PRs Created metric
     */
    async getPRsCreated(): Promise<number> {
        // Get data for the last 30 days
        const endTime = new Date();
        const startTime = new Date();
        startTime.setDate(startTime.getDate() - 30);

        try {
            const repositories = this.repositories;
            let totalPRsCreated = 0;

            // Sum up PRs created across all repositories
            for (const repo of repositories) {
                const command = new GetMetricStatisticsCommand({
                    Namespace: NAMESPACE,
                    MetricName: "PRsCreated",
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
                            totalPRsCreated += datapoint.Sum;
                        }
                    }
                }
            }

            return totalPRsCreated;
        } catch (error) {
            console.error("Error fetching PRs created metrics:", error);
            throw error;
        }
    }

    /**
     * Get Lines of Code Generated metric
     */
    async getLinesOfCode(): Promise<number> {
        // Get data for the last 30 days
        const endTime = new Date();
        const startTime = new Date();
        startTime.setDate(startTime.getDate() - 30);

        try {
            const repositories = this.repositories;
            let totalLinesOfCode = 0;

            // Sum up lines of code across all repositories
            for (const repo of repositories) {
                const command = new GetMetricStatisticsCommand({
                    Namespace: NAMESPACE,
                    MetricName: "LinesOfCode",
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
                            totalLinesOfCode += datapoint.Sum;
                        }
                    }
                }
            }

            return totalLinesOfCode;
        } catch (error) {
            console.error("Error fetching lines of code metrics:", error);
            throw error;
        }
    }

    /**
     * Get Token Usage metrics
     */
    async getTokenUsage(): Promise<{
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
        tokenCost: number;
    }> {
        // Get data for the last 30 days
        const endTime = new Date();
        const startTime = new Date();
        startTime.setDate(startTime.getDate() - 30);

        try {
            const repositories = this.repositories;
            let inputTokens = 0;
            let outputTokens = 0;
            let totalTokens = 0;
            let tokenCost = 0;

            // Sum up token usage across all repositories
            for (const repo of repositories) {
                // Get input tokens
                const inputTokensCommand = new GetMetricStatisticsCommand({
                    Namespace: NAMESPACE,
                    MetricName: "InputTokens",
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

                const inputTokensResponse = await cloudWatchClient.send(inputTokensCommand);

                if (inputTokensResponse.Datapoints) {
                    for (const datapoint of inputTokensResponse.Datapoints) {
                        if (datapoint.Sum !== undefined) {
                            inputTokens += datapoint.Sum;
                        }
                    }
                }

                // Get output tokens
                const outputTokensCommand = new GetMetricStatisticsCommand({
                    Namespace: NAMESPACE,
                    MetricName: "OutputTokens",
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

                const outputTokensResponse = await cloudWatchClient.send(outputTokensCommand);

                if (outputTokensResponse.Datapoints) {
                    for (const datapoint of outputTokensResponse.Datapoints) {
                        if (datapoint.Sum !== undefined) {
                            outputTokens += datapoint.Sum;
                        }
                    }
                }

                // Get total tokens (separate metric in case some repositories only have this aggregated value)
                const totalTokensCommand = new GetMetricStatisticsCommand({
                    Namespace: NAMESPACE,
                    MetricName: "TotalTokens",
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

                const totalTokensResponse = await cloudWatchClient.send(totalTokensCommand);

                if (totalTokensResponse.Datapoints) {
                    for (const datapoint of totalTokensResponse.Datapoints) {
                        if (datapoint.Sum !== undefined) {
                            totalTokens += datapoint.Sum;
                        }
                    }
                }

                // Get token cost
                const tokenCostCommand = new GetMetricStatisticsCommand({
                    Namespace: NAMESPACE,
                    MetricName: "TokenCost",
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

                const tokenCostResponse = await cloudWatchClient.send(tokenCostCommand);

                if (tokenCostResponse.Datapoints) {
                    for (const datapoint of tokenCostResponse.Datapoints) {
                        if (datapoint.Sum !== undefined) {
                            tokenCost += datapoint.Sum;
                        }
                    }
                }
            }

            // If we have input and output tokens but not total (unlikely), calculate the total
            if (totalTokens === 0 && (inputTokens > 0 || outputTokens > 0)) {
                totalTokens = inputTokens + outputTokens;
            }

            return {
                inputTokens,
                outputTokens,
                totalTokens,
                tokenCost,
            };
        } catch (error) {
            console.error("Error fetching token usage metrics:", error);
            throw error;
        }
    }
}
