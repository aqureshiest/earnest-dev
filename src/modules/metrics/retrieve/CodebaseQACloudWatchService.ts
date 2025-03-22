import { GetMetricDataCommand } from "@aws-sdk/client-cloudwatch";
import { BaseCloudWatchService } from "./BaseCloudwatchService";
import { MetricDataResult, TimeRange, TokenUsageStats } from "./types";
import { METRICS_CONFIG } from "../generate/config";

export interface QAMetricsStats {
    totalRequests: number;
    successRate: number;
    generalQuestions: number;
    specificQuestions: number;
    averageFilesAnalyzed: number;
    conversationQuestions: number;
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

    async getTotalQARequestsSum(): Promise<number> {
        let totalSum = 0;

        for (const repo of this.repositories) {
            const repoSum = await this.getMetricSum("QARequests", [
                { Name: "Repository", Value: repo },
            ]);
            totalSum += repoSum;
        }

        return totalSum;
    }

    async getQASuccessRate(): Promise<number> {
        const timeRange = this.getDefaultTimeRange();
        let totalRequests = 0;
        let totalSuccesses = 0;

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

    async getQuestionTypes(): Promise<QuestionTypeStats> {
        const timeRange = this.getDefaultTimeRange();
        let generalCount = 0;
        let specificCount = 0;

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

    async getConversationQuestions(): Promise<number> {
        let totalSum = 0;

        for (const repo of this.repositories) {
            const repoSum = await this.getMetricSum("ConversationQuestions", [
                { Name: "Repository", Value: repo },
            ]);
            totalSum += repoSum;
        }

        return totalSum;
    }

    async getAverageFilesAnalyzed(): Promise<number> {
        let totalAvg = 0;
        let repoCount = 0;

        for (const repo of this.repositories) {
            const repoAvg = await this.getMetricAverage("FilesAnalyzed", [
                { Name: "Repository", Value: repo },
            ]);

            if (repoAvg > 0) {
                totalAvg += repoAvg;
                repoCount++;
            }
        }

        return repoCount > 0 ? totalAvg / repoCount : 0;
    }

    async getQATokenUsage(): Promise<TokenUsageStats> {
        const timeRange = this.getDefaultTimeRange();
        let inputTokens = 0;
        let outputTokens = 0;
        let totalTokens = 0;
        let tokenCost = 0;

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

    async getQuestionTypeDistributionOverTime(
        startTime: Date,
        endTime: Date
    ): Promise<{
        general: MetricDataResult;
        specific: MetricDataResult;
    }> {
        // Create a command with one query per repository and type
        const command = new GetMetricDataCommand({
            StartTime: startTime,
            EndTime: endTime,
            ScanBy: "TimestampAscending",
            MetricDataQueries: [
                // Generate queries for each repository and question type
                ...this.repositories.flatMap((repo, repoIndex) => [
                    {
                        Id: `general${repoIndex}`,
                        MetricStat: {
                            Metric: {
                                Namespace: this.namespace,
                                MetricName: "QuestionType",
                                Dimensions: [
                                    { Name: "Repository", Value: repo },
                                    { Name: "Type", Value: "general" },
                                ],
                            },
                            Period: 86400,
                            Stat: "Sum",
                        },
                        Label: `${repo} General Questions`,
                    },
                    {
                        Id: `specific${repoIndex}`,
                        MetricStat: {
                            Metric: {
                                Namespace: this.namespace,
                                MetricName: "QuestionType",
                                Dimensions: [
                                    { Name: "Repository", Value: repo },
                                    { Name: "Type", Value: "specific" },
                                ],
                            },
                            Period: 86400,
                            Stat: "Sum",
                        },
                        Label: `${repo} Specific Questions`,
                    },
                ]),

                // Add sum expressions if there's more than one repository
                ...(this.repositories.length > 1
                    ? [
                          {
                              Id: "totalGeneral",
                              Expression: this.repositories
                                  .map((_, index) => `general${index}`)
                                  .join("+"),
                              Label: "General Questions",
                              ReturnData: true,
                          },
                          {
                              Id: "totalSpecific",
                              Expression: this.repositories
                                  .map((_, index) => `specific${index}`)
                                  .join("+"),
                              Label: "Specific Questions",
                              ReturnData: true,
                          },
                      ]
                    : [
                          {
                              Id: "totalGeneral",
                              Expression: "general0",
                              Label: "General Questions",
                              ReturnData: true,
                          },
                          {
                              Id: "totalSpecific",
                              Expression: "specific0",
                              Label: "Specific Questions",
                              ReturnData: true,
                          },
                      ]),
            ],
        });

        try {
            const response = await this.client.send(command);

            if (!response.MetricDataResults || response.MetricDataResults.length === 0) {
                return {
                    general: { label: "General Questions", values: [], timestamps: [] },
                    specific: { label: "Specific Questions", values: [], timestamps: [] },
                };
            }

            // Extract the general and specific question results
            const generalResult = response.MetricDataResults.find((r) => r.Id === "totalGeneral");
            const specificResult = response.MetricDataResults.find((r) => r.Id === "totalSpecific");

            return {
                general: {
                    label: generalResult?.Label || "General Questions",
                    values: generalResult?.Values || [],
                    timestamps: generalResult?.Timestamps || [],
                },
                specific: {
                    label: specificResult?.Label || "Specific Questions",
                    values: specificResult?.Values || [],
                    timestamps: specificResult?.Timestamps || [],
                },
            };
        } catch (error) {
            console.error("Error fetching question type distribution over time:", error);
            throw error;
        }
    }

    async getQAProcessingTimeOverTime(startTime: Date, endTime: Date): Promise<MetricDataResult> {
        const command = new GetMetricDataCommand({
            StartTime: startTime,
            EndTime: endTime,
            ScanBy: "TimestampAscending",
            MetricDataQueries: [
                {
                    Id: "mprocessingtime",
                    Expression: `AVG(SEARCH('{${METRICS_CONFIG.namespace},Repository} MetricName=\"QAProcessingTime\"', 'Average', 86400))`,
                    Label: "Average Processing Time (ms)",
                    Period: 86400, // 1 day aggregation
                    ReturnData: true,
                },
            ],
        });

        try {
            const response = await this.client.send(command);

            if (!response.MetricDataResults || response.MetricDataResults.length === 0) {
                return { label: "Average Processing Time (ms)", values: [], timestamps: [] };
            }

            const result = response.MetricDataResults[0];

            return {
                label: result.Label || "Average Processing Time (ms)",
                values: result.Values || [],
                timestamps: result.Timestamps || [],
            };
        } catch (error) {
            console.error("Error fetching processing time over time:", error);
            throw error;
        }
    }

    async getQATokenUsageOverTime(
        startTime: Date,
        endTime: Date
    ): Promise<{
        input: MetricDataResult;
        output: MetricDataResult;
    }> {
        // Similar to getQuestionsOverTime, create separate metric queries for each repository and type
        const questionTypes = ["general", "specific"];
        const metricQueries = [];

        // Create an ID counter to generate unique IDs for each query
        let idCounter = 0;

        // Create metrics for each combination of repository and type
        for (const repo of this.repositories) {
            for (const type of questionTypes) {
                // Add a query for input tokens
                metricQueries.push({
                    Id: `input${idCounter}`,
                    MetricStat: {
                        Metric: {
                            Namespace: this.namespace,
                            MetricName: "QAInputTokens",
                            Dimensions: [
                                { Name: "Repository", Value: repo },
                                { Name: "Type", Value: type },
                            ],
                        },
                        Period: 86400,
                        Stat: "Sum",
                    },
                    Label: `${repo} ${type} Input Tokens`,
                });

                // Add a query for output tokens
                metricQueries.push({
                    Id: `output${idCounter}`,
                    MetricStat: {
                        Metric: {
                            Namespace: this.namespace,
                            MetricName: "QAOutputTokens",
                            Dimensions: [
                                { Name: "Repository", Value: repo },
                                { Name: "Type", Value: type },
                            ],
                        },
                        Period: 86400,
                        Stat: "Sum",
                    },
                    Label: `${repo} ${type} Output Tokens`,
                });

                idCounter++;
            }

            // Also check for tokens with just the repository dimension
            metricQueries.push({
                Id: `input${idCounter}`,
                MetricStat: {
                    Metric: {
                        Namespace: this.namespace,
                        MetricName: "QAInputTokens",
                        Dimensions: [{ Name: "Repository", Value: repo }],
                    },
                    Period: 86400,
                    Stat: "Sum",
                },
                Label: `${repo} Input Tokens`,
            });

            metricQueries.push({
                Id: `output${idCounter}`,
                MetricStat: {
                    Metric: {
                        Namespace: this.namespace,
                        MetricName: "QAOutputTokens",
                        Dimensions: [{ Name: "Repository", Value: repo }],
                    },
                    Period: 86400,
                    Stat: "Sum",
                },
                Label: `${repo} Output Tokens`,
            });

            idCounter++;
        }

        // Add expressions to sum all the input and output tokens
        const inputIds = [];
        const outputIds = [];
        for (let i = 0; i < idCounter; i++) {
            inputIds.push(`input${i}`);
            outputIds.push(`output${i}`);
        }

        metricQueries.push({
            Id: "totalInput",
            Expression: inputIds.join("+"),
            Label: "Input Tokens",
            ReturnData: true,
        });

        metricQueries.push({
            Id: "totalOutput",
            Expression: outputIds.join("+"),
            Label: "Output Tokens",
            ReturnData: true,
        });

        const command = new GetMetricDataCommand({
            StartTime: startTime,
            EndTime: endTime,
            ScanBy: "TimestampAscending",
            MetricDataQueries: metricQueries,
        });

        try {
            const response = await this.client.send(command);

            if (!response.MetricDataResults || response.MetricDataResults.length === 0) {
                // If no data, create a placeholder with zeros that matches the other time series
                return {
                    input: { label: "Input Tokens", values: [0], timestamps: [new Date()] },
                    output: { label: "Output Tokens", values: [0], timestamps: [new Date()] },
                };
            }

            const inputResult = response.MetricDataResults.find((r) => r.Id === "totalInput");
            const outputResult = response.MetricDataResults.find((r) => r.Id === "totalOutput");

            return {
                input: {
                    label: inputResult?.Label || "Input Tokens",
                    values: inputResult?.Values?.length ? inputResult.Values : [0],
                    timestamps: inputResult?.Timestamps?.length
                        ? inputResult.Timestamps
                        : [new Date()],
                },
                output: {
                    label: outputResult?.Label || "Output Tokens",
                    values: outputResult?.Values?.length ? outputResult.Values : [0],
                    timestamps: outputResult?.Timestamps?.length
                        ? outputResult.Timestamps
                        : [new Date()],
                },
            };
        } catch (error) {
            console.error("Error fetching token usage over time:", error);
            // Create default values that match other time series
            return {
                input: { label: "Input Tokens", values: [0], timestamps: [new Date()] },
                output: { label: "Output Tokens", values: [0], timestamps: [new Date()] },
            };
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

    async getAllQAMetrics(): Promise<QAMetricsStats> {
        const [
            totalRequests,
            successRate,
            questionTypes,
            conversationQuestions,
            averageFilesAnalyzed,
            tokenUsage,
        ] = await Promise.all([
            this.getTotalQARequestsSum(),
            this.getQASuccessRate(),
            this.getQuestionTypes(),
            this.getConversationQuestions(),
            this.getAverageFilesAnalyzed(),
            this.getQATokenUsage(),
        ]);

        return {
            totalRequests,
            successRate,
            generalQuestions: questionTypes.generalCount,
            specificQuestions: questionTypes.specificCount,
            conversationQuestions,
            averageFilesAnalyzed,
            tokenUsage,
            repositories: this.repositories,
        };
    }

    async getQATimeSeriesData(startTime: Date, endTime: Date): Promise<any> {
        try {
            // Get all time series data in parallel
            const [
                questionsOverTime,
                questionTypeData,
                processingTimeOverTime,
                tokenUsageData,
                successRateOverTime,
            ] = await Promise.all([
                this.getQuestionsOverTime(startTime, endTime),
                this.getQuestionTypeDistributionOverTime(startTime, endTime),
                this.getQAProcessingTimeOverTime(startTime, endTime),
                this.getQATokenUsageOverTime(startTime, endTime),
                this.getQASuccessRateOverTime(startTime, endTime),
            ]);

            // Format the time series data
            return {
                questionsOverTime: this.formatTimeSeriesData(questionsOverTime),
                questionTypeDistribution: {
                    general: this.formatTimeSeriesData(questionTypeData.general),
                    specific: this.formatTimeSeriesData(questionTypeData.specific),
                },
                processingTimeOverTime: this.formatTimeSeriesData(processingTimeOverTime),
                tokenUsageOverTime: {
                    input: this.formatTimeSeriesData(tokenUsageData.input),
                    output: this.formatTimeSeriesData(tokenUsageData.output),
                },
                successRateOverTime: this.formatTimeSeriesData(successRateOverTime),
            };
        } catch (error) {
            console.error("Error fetching QA time series data:", error);
            // Return empty data on error
            return {
                questionsOverTime: [],
                questionTypeDistribution: { general: [], specific: [] },
                processingTimeOverTime: [],
                tokenUsageOverTime: { input: [], output: [] },
                successRateOverTime: [],
            };
        }
    }
}
