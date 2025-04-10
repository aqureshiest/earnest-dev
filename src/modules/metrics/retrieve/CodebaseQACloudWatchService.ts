import { GetMetricDataCommand } from "@aws-sdk/client-cloudwatch";
import { BaseCloudWatchService } from "./BaseCloudwatchService";
import { MetricDataResult, TokenUsageStats } from "./types";
import { METRICS_CONFIG } from "../generate/config";

export interface QAMetricsStats {
    totalRequests: number;
    successRate: number;
    generalQuestions: number;
    specificQuestions: number;
    averageFilesAnalyzed: number;
    conversationQuestions: number;
    averageProcessingTime: number;
    tokenUsage: TokenUsageStats;
    repositories: string[];
}

export interface QuestionTypeStats {
    generalCount: number;
    specificCount: number;
    percentGeneral: number;
    percentSpecific: number;
}

export class CodebaseQACloudWatchService extends BaseCloudWatchService {
    private repositories: string[];

    constructor(repositories: string[], namespace?: string) {
        super(namespace ? namespace : METRICS_CONFIG.namespace);
        this.repositories = repositories;
    }

    async getTotalQARequestsSum(startTime: Date, endTime: Date): Promise<number> {
        let totalSum = 0;

        for (const repo of this.repositories) {
            const repoSum = await this.getMetricSum(
                "QARequests",
                [{ Name: "Repository", Value: repo }],
                { startTime, endTime }
            );
            totalSum += repoSum;
        }

        return totalSum;
    }

    async getQASuccessRate(startTime: Date, endTime: Date): Promise<number> {
        let totalRequests = 0;
        let totalSuccesses = 0;
        const timeRange = { startTime, endTime };

        for (const repo of this.repositories) {
            const dimensions = [{ Name: "Repository", Value: repo }];
            const requests = await this.getMetricSum("QARequests", dimensions, timeRange);
            const successes = await this.getMetricSum("QASuccess", dimensions, timeRange);

            totalRequests += requests;
            totalSuccesses += successes;
        }

        // Calculate success rate percentage
        if (totalRequests === 0) {
            return 0;
        }

        return (totalSuccesses / totalRequests) * 100;
    }

    async getQuestionTypes(startTime: Date, endTime: Date): Promise<QuestionTypeStats> {
        let generalCount = 0;
        let specificCount = 0;
        const timeRange = { startTime, endTime };

        for (const repo of this.repositories) {
            // Get general questions count
            const generalQs = await this.getMetricSum(
                "QuestionType",
                [
                    { Name: "Repository", Value: repo },
                    { Name: "Type", Value: "general" },
                ],
                timeRange
            );

            // Get specific questions count
            const specificQs = await this.getMetricSum(
                "QuestionType",
                [
                    { Name: "Repository", Value: repo },
                    { Name: "Type", Value: "specific" },
                ],
                timeRange
            );

            generalCount += generalQs;
            specificCount += specificQs;
        }

        const total = generalCount + specificCount;

        return {
            generalCount,
            specificCount,
            percentGeneral: total > 0 ? (generalCount / total) * 100 : 0,
            percentSpecific: total > 0 ? (specificCount / total) * 100 : 0,
        };
    }

    async getConversationQuestions(startTime: Date, endTime: Date): Promise<number> {
        let totalSum = 0;

        for (const repo of this.repositories) {
            const repoSum = await this.getMetricSum(
                "ConversationQuestions",
                [{ Name: "Repository", Value: repo }],
                { startTime, endTime }
            );
            totalSum += repoSum;
        }

        return totalSum;
    }

    async getAverageFilesAnalyzed(startTime: Date, endTime: Date): Promise<number> {
        let totalAvg = 0;
        let repoCount = 0;

        for (const repo of this.repositories) {
            const repoAvg = await this.getMetricAverage(
                "FilesAnalyzed",
                [{ Name: "Repository", Value: repo }],
                { startTime, endTime }
            );

            if (repoAvg > 0) {
                totalAvg += repoAvg;
                repoCount++;
            }
        }

        return repoCount > 0 ? totalAvg / repoCount : 0;
    }

    async getAverageProcessingTime(startTime: Date, endTime: Date): Promise<number> {
        let totalAvg = 0;
        let repoCount = 0;

        for (const repo of this.repositories) {
            const repoAvg = await this.getMetricAverage(
                "QAProcessingTime",
                [{ Name: "Repository", Value: repo }],
                { startTime, endTime }
            );

            if (repoAvg > 0) {
                totalAvg += repoAvg;
                repoCount++;
            }
        }

        return repoCount > 0 ? totalAvg / repoCount : 0;
    }

    async getQATokenUsage(startTime: Date, endTime: Date): Promise<TokenUsageStats> {
        let inputTokens = 0;
        let outputTokens = 0;
        let totalTokens = 0;
        let tokenCost = 0;
        const timeRange = { startTime, endTime };

        // Token metrics include both Repository and Type dimensions
        const questionTypes = ["general", "specific"];

        for (const repo of this.repositories) {
            // First, try with both dimensions (Repository and Type)
            for (const type of questionTypes) {
                const dimensions = [
                    { Name: "Repository", Value: repo },
                    { Name: "Type", Value: type },
                ];

                const repoInputTokens = await this.getMetricSum(
                    "QAInputTokens",
                    dimensions,
                    timeRange
                );
                const repoOutputTokens = await this.getMetricSum(
                    "QAOutputTokens",
                    dimensions,
                    timeRange
                );
                const repoTotalTokens = await this.getMetricSum(
                    "QATotalTokens",
                    dimensions,
                    timeRange
                );
                const repoTokenCost = await this.getMetricSum("QATokenCost", dimensions, timeRange);

                inputTokens += repoInputTokens;
                outputTokens += repoOutputTokens;
                totalTokens += repoTotalTokens;
                tokenCost += repoTokenCost;
            }

            // Also try with just Repository dimension in case some metrics are tracked that way
            const repoDimension = [{ Name: "Repository", Value: repo }];
            const repoOnlyInputTokens = await this.getMetricSum(
                "QAInputTokens",
                repoDimension,
                timeRange
            );
            const repoOnlyOutputTokens = await this.getMetricSum(
                "QAOutputTokens",
                repoDimension,
                timeRange
            );
            const repoOnlyTotalTokens = await this.getMetricSum(
                "QATotalTokens",
                repoDimension,
                timeRange
            );
            const repoOnlyTokenCost = await this.getMetricSum(
                "QATokenCost",
                repoDimension,
                timeRange
            );

            inputTokens += repoOnlyInputTokens;
            outputTokens += repoOnlyOutputTokens;
            totalTokens += repoOnlyTotalTokens;
            tokenCost += repoOnlyTokenCost;
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

    async getQuestionsOverTime(startTime: Date, endTime: Date): Promise<MetricDataResult> {
        // Using a repository-specific approach like we use for the aggregate count
        const command = new GetMetricDataCommand({
            StartTime: startTime,
            EndTime: endTime,
            ScanBy: "TimestampAscending",
            MetricDataQueries: [
                // Create metrics for each repository
                ...this.repositories.map((repo, index) => ({
                    Id: `repo${index}`,
                    MetricStat: {
                        Metric: {
                            Namespace: this.namespace,
                            MetricName: "QARequests",
                            Dimensions: [
                                {
                                    Name: "Repository",
                                    Value: repo,
                                },
                            ],
                        },
                        Period: 86400, // 1 day aggregation
                        Stat: "Sum",
                    },
                    Label: `${repo} Requests`,
                })),
                // Add a sum expression to combine all repositories
                {
                    Id: "total",
                    Expression: this.repositories.map((_, index) => `repo${index}`).join("+"),
                    Label: "Codebase Questions Over Time",
                    ReturnData: true,
                },
            ],
        });

        try {
            const response = await this.client.send(command);

            if (!response.MetricDataResults || response.MetricDataResults.length === 0) {
                return { label: "Codebase Questions Over Time", values: [], timestamps: [] };
            }

            const result = response.MetricDataResults.find((r) => r.Id === "total");
            if (!result) {
                return { label: "Codebase Questions Over Time", values: [], timestamps: [] };
            }

            return {
                label: result.Label || "Codebase Questions Over Time",
                values: result.Values || [],
                timestamps: result.Timestamps || [],
            };
        } catch (error) {
            console.error("Error fetching questions over time:", error);
            throw error;
        }
    }

    async getQASuccessRateOverTime(startTime: Date, endTime: Date): Promise<MetricDataResult> {
        const command = new GetMetricDataCommand({
            StartTime: startTime,
            EndTime: endTime,
            ScanBy: "TimestampAscending",
            MetricDataQueries: [
                {
                    Id: "msuccess",
                    Expression: `SUM(SEARCH('{${METRICS_CONFIG.namespace},Repository} MetricName=\"QASuccess\"', 'Sum', 86400))`,
                    Label: "Success Count",
                    Period: 86400,
                },
                {
                    Id: "mrequests",
                    Expression: `SUM(SEARCH('{${METRICS_CONFIG.namespace},Repository} MetricName=\"QARequests\"', 'Sum', 86400))`,
                    Label: "Request Count",
                    Period: 86400,
                },
                {
                    Id: "msuccessrate",
                    Expression: "100*(msuccess/mrequests)", // Get percentage
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

            const result = response.MetricDataResults.find((r) => r.Id === "msuccessrate");
            if (!result) {
                return { label: "Success Rate Over Time (%)", values: [], timestamps: [] };
            }

            // Validate success rate values are percentages (0-100%)
            const validatedValues =
                result.Values?.map((value) => {
                    if (isNaN(value)) return 0;
                    if (value > 100) return 100;
                    return value;
                }) || [];

            return {
                label: result.Label || "Success Rate Over Time (%)",
                values: validatedValues,
                timestamps: result.Timestamps || [],
            };
        } catch (error) {
            console.error("Error fetching QA success rate over time:", error);
            throw error;
        }
    }

    async getAllQAMetrics(startTime: Date, endTime: Date): Promise<QAMetricsStats> {
        const [
            totalRequests,
            successRate,
            questionTypes,
            conversationQuestions,
            averageFilesAnalyzed,
            averageProcessingTime,
            tokenUsage,
        ] = await Promise.all([
            this.getTotalQARequestsSum(startTime, endTime),
            this.getQASuccessRate(startTime, endTime),
            this.getQuestionTypes(startTime, endTime),
            this.getConversationQuestions(startTime, endTime),
            this.getAverageFilesAnalyzed(startTime, endTime),
            this.getAverageProcessingTime(startTime, endTime),
            this.getQATokenUsage(startTime, endTime),
        ]);

        return {
            totalRequests,
            successRate,
            generalQuestions: questionTypes.generalCount,
            specificQuestions: questionTypes.specificCount,
            conversationQuestions,
            averageFilesAnalyzed,
            averageProcessingTime,
            tokenUsage,
            repositories: this.repositories,
        };
    }

    async getQATimeSeriesData(startTime: Date, endTime: Date): Promise<any> {
        try {
            // Get all time series data in parallel
            const [questionsOverTime, successRateOverTime] = await Promise.all([
                this.getQuestionsOverTime(startTime, endTime),
                this.getQASuccessRateOverTime(startTime, endTime),
            ]);

            // Format the time series data
            return {
                questionsOverTime: this.formatTimeSeriesData(questionsOverTime),
                successRateOverTime: this.formatTimeSeriesData(successRateOverTime),
            };
        } catch (error) {
            console.error("Error fetching QA time series data:", error);
            // Return empty data on error
            return {
                questionsOverTime: [],
                successRateOverTime: [],
            };
        }
    }
}
