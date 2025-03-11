import { GetMetricDataCommand } from "@aws-sdk/client-cloudwatch";
import { BaseCloudWatchService } from "./BaseCloudwatchService";
import { CodeGenMetricsStats, MetricDataResult, TimeRange, TokenUsageStats } from "./types";
import { METRICS_CONFIG } from "../generate/config";

export class CodeGenCloudWatchService extends BaseCloudWatchService {
    private repositories: string[];

    constructor(repositories: string[], namespace?: string) {
        super(namespace ? namespace : METRICS_CONFIG.namespace);
        this.repositories = repositories;
    }

    async getTotalRequestsSum(): Promise<number> {
        let totalSum = 0;

        for (const repo of this.repositories) {
            const repoSum = await this.getMetricSum("Requests", [
                { Name: "Repository", Value: repo },
            ]);
            totalSum += repoSum;
        }

        return totalSum;
    }

    async getSuccessRate(): Promise<number> {
        const timeRange = this.getDefaultTimeRange();
        let totalRequests = 0;
        let totalSuccesses = 0;

        for (const repo of this.repositories) {
            const dimensions = [{ Name: "Repository", Value: repo }];
            const requests = await this.getMetricSum("Requests", dimensions, timeRange);
            const successes = await this.getMetricSum("Success", dimensions, timeRange);

            totalRequests += requests;
            totalSuccesses += successes;
        }

        // Calculate success rate percentage
        if (totalRequests === 0) {
            return 0;
        }

        return (totalSuccesses / totalRequests) * 100;
    }

    async getPRsCreated(): Promise<number> {
        let totalSum = 0;

        for (const repo of this.repositories) {
            const repoSum = await this.getMetricSum("PRsCreated", [
                { Name: "Repository", Value: repo },
            ]);
            totalSum += repoSum;
        }

        return totalSum;
    }

    async getLinesOfCode(): Promise<number> {
        let totalSum = 0;

        for (const repo of this.repositories) {
            const repoSum = await this.getMetricSum("LinesOfCode", [
                { Name: "Repository", Value: repo },
            ]);
            totalSum += repoSum;
        }

        return totalSum;
    }

    async getTokenUsage(): Promise<TokenUsageStats> {
        const timeRange = this.getDefaultTimeRange();
        let inputTokens = 0;
        let outputTokens = 0;
        let totalTokens = 0;
        let tokenCost = 0;

        for (const repo of this.repositories) {
            const dimensions = [{ Name: "Repository", Value: repo }];

            const repoInputTokens = await this.getMetricSum("InputTokens", dimensions, timeRange);
            const repoOutputTokens = await this.getMetricSum("OutputTokens", dimensions, timeRange);
            const repoTotalTokens = await this.getMetricSum("TotalTokens", dimensions, timeRange);
            const repoTokenCost = await this.getMetricSum("TokenCost", dimensions, timeRange);

            inputTokens += repoInputTokens;
            outputTokens += repoOutputTokens;
            totalTokens += repoTotalTokens;
            tokenCost += repoTokenCost;
        }

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

    async getTotalRequests(startTime: Date, endTime: Date): Promise<MetricDataResult> {
        const command = new GetMetricDataCommand({
            StartTime: startTime,
            EndTime: endTime,
            ScanBy: "TimestampAscending",
            MetricDataQueries: [
                {
                    Id: "totalRequests",
                    Expression: `SUM(SEARCH('{${this.namespace},Repository} MetricName=\"Requests\"', 'Sum'))`,
                    Label: "Total Requests",
                    Period: 3600, // 1 hour aggregation
                    ReturnData: true,
                },
            ],
        });

        try {
            const response = await this.client.send(command);

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

    async getAllMetrics(): Promise<CodeGenMetricsStats> {
        const [totalRequests, successRate, prsCreated, linesOfCode, tokenUsage] = await Promise.all(
            [
                this.getTotalRequestsSum(),
                this.getSuccessRate(),
                this.getPRsCreated(),
                this.getLinesOfCode(),
                this.getTokenUsage(),
            ]
        );

        return {
            totalRequests,
            successRate,
            prsCreated,
            linesOfCode,
            tokenUsage,
            repositories: this.repositories,
        };
    }

    async getRequestsOverTime(startTime: Date, endTime: Date): Promise<MetricDataResult> {
        const command = new GetMetricDataCommand({
            StartTime: startTime,
            EndTime: endTime,
            ScanBy: "TimestampAscending",
            MetricDataQueries: [
                {
                    Id: "mrequests",
                    Expression: `SUM(SEARCH('{${METRICS_CONFIG.namespace},Repository} MetricName=\"Requests\"', 'Sum', 86400))`,
                    Label: "Code Generation Requests Over Time",
                    Period: 86400, // 1 day aggregation
                    ReturnData: true,
                },
            ],
        });

        try {
            const response = await this.client.send(command);

            if (!response.MetricDataResults || response.MetricDataResults.length === 0) {
                return { label: "Code Generation Requests Over Time", values: [], timestamps: [] };
            }

            const result = response.MetricDataResults[0];

            return {
                label: result.Label || "Code Generation Requests Over Time",
                values: result.Values || [],
                timestamps: result.Timestamps || [],
            };
        } catch (error) {
            console.error("Error fetching requests over time:", error);
            throw error;
        }
    }

    async getSuccessRateOverTime(startTime: Date, endTime: Date): Promise<MetricDataResult> {
        const command = new GetMetricDataCommand({
            StartTime: startTime,
            EndTime: endTime,
            ScanBy: "TimestampAscending",
            MetricDataQueries: [
                {
                    Id: "msuccess",
                    Expression: `SUM(SEARCH('{${METRICS_CONFIG.namespace},Repository} MetricName=\"Success\"', 'Sum', 86400))`,
                    Label: "Success Count",
                    Period: 86400,
                },
                {
                    Id: "mrequests",
                    Expression: `SUM(SEARCH('{${METRICS_CONFIG.namespace},Repository} MetricName=\"Requests\"', 'Sum', 86400))`,
                    Label: "Request Count",
                    Period: 86400,
                },
                {
                    Id: "msuccessrate",
                    Expression: "100*(msuccess/mrequests)", // Ensure we multiply by 100 to get percentage
                    Label: "Success Rate Over Time (%)",
                    Period: 86400, // 1 day aggregation
                    ReturnData: true,
                },
            ],
        });

        try {
            const response = await this.client.send(command);

            if (!response.MetricDataResults || response.MetricDataResults.length === 0) {
                return { label: "Success Rate Over Time (%)", values: [], timestamps: [] };
            }

            const result = response.MetricDataResults[response.MetricDataResults.length - 1];

            // Validate success rate values are percentages
            const validatedValues =
                result.Values?.map((value) => {
                    // If value is NaN (e.g., due to division by zero), return 0
                    if (isNaN(value)) return 0;
                    // If value exceeds 100, cap it at 100%
                    if (value > 100) return 100;
                    return value;
                }) || [];

            return {
                label: result.Label || "Success Rate Over Time (%)",
                values: validatedValues,
                timestamps: result.Timestamps || [],
            };
        } catch (error) {
            console.error("Error fetching success rate over time:", error);
            throw error;
        }
    }

    async getLinesOfCodeOverTime(startTime: Date, endTime: Date): Promise<MetricDataResult> {
        const command = new GetMetricDataCommand({
            StartTime: startTime,
            EndTime: endTime,
            ScanBy: "TimestampAscending",
            MetricDataQueries: [
                {
                    Id: "mlinesofcode",
                    Expression: `SUM(SEARCH('{${METRICS_CONFIG.namespace},Repository} MetricName=\"LinesOfCode\"', 'Sum', 86400))`,
                    Label: "Lines of Code Generated Over Time",
                    Period: 86400, // 1 day aggregation
                    ReturnData: true,
                },
            ],
        });

        try {
            const response = await this.client.send(command);

            if (!response.MetricDataResults || response.MetricDataResults.length === 0) {
                return { label: "Lines of Code Generated Over Time", values: [], timestamps: [] };
            }

            const result = response.MetricDataResults[0];

            return {
                label: result.Label || "Lines of Code Generated Over Time",
                values: result.Values || [],
                timestamps: result.Timestamps || [],
            };
        } catch (error) {
            console.error("Error fetching lines of code over time:", error);
            throw error;
        }
    }

    async getPRsCreatedOverTime(startTime: Date, endTime: Date): Promise<MetricDataResult> {
        const command = new GetMetricDataCommand({
            StartTime: startTime,
            EndTime: endTime,
            ScanBy: "TimestampAscending",
            MetricDataQueries: [
                {
                    Id: "mprscreated",
                    Expression: `SUM(SEARCH('{${METRICS_CONFIG.namespace},Repository} MetricName=\"PRsCreated\"', 'Sum', 86400))`,
                    Label: "Pull Requests Created Over Time",
                    Period: 86400, // 1 day aggregation
                    ReturnData: true,
                },
            ],
        });

        try {
            const response = await this.client.send(command);

            if (!response.MetricDataResults || response.MetricDataResults.length === 0) {
                return { label: "Pull Requests Created Over Time", values: [], timestamps: [] };
            }

            const result = response.MetricDataResults[0];

            return {
                label: result.Label || "Pull Requests Created Over Time",
                values: result.Values || [],
                timestamps: result.Timestamps || [],
            };
        } catch (error) {
            console.error("Error fetching PRs created over time:", error);
            throw error;
        }
    }
}
