import { BaseCloudWatchService } from "./BaseCloudwatchService";
import { PRDMetricsStats, TokenUsageStats, MetricDataResult } from "./types";
import { METRICS_CONFIG } from "../generate/config";

export class PRDCloudWatchService extends BaseCloudWatchService {
    constructor(namespace?: string) {
        super(namespace ? namespace : METRICS_CONFIG.namespace);
    }

    async getPRDRequestCount(startTime: Date, endTime: Date): Promise<number> {
        return this.getMetricSum("PRD_Requests", [], { startTime, endTime });
    }

    async getPRDSuccessRate(startTime: Date, endTime: Date): Promise<number> {
        const timeRange = { startTime, endTime };
        const totalRequests = await this.getMetricSum("PRD_Requests", [], timeRange);
        const totalSuccesses = await this.getMetricSum("PRD_Success", [], timeRange);

        // Calculate success rate percentage
        if (totalRequests === 0) {
            return 0;
        }

        return (totalSuccesses / totalRequests) * 100;
    }

    async getPRDAverageDuration(startTime: Date, endTime: Date): Promise<number> {
        return this.getMetricAverage("PRD_Duration", [], { startTime, endTime });
    }

    async getPRDFeatureCount(startTime: Date, endTime: Date): Promise<number> {
        return this.getMetricSum("PRD_FeatureCount", [], { startTime, endTime });
    }

    async getPRDScreenCount(startTime: Date, endTime: Date): Promise<number> {
        return this.getMetricSum("PRD_ScreenCount", [], { startTime, endTime });
    }

    async getPRDWordCount(startTime: Date, endTime: Date): Promise<number> {
        return this.getMetricSum("PRD_WordCount", [], { startTime, endTime });
    }

    async getPRDTokenUsage(startTime: Date, endTime: Date): Promise<TokenUsageStats> {
        const timeRange = { startTime, endTime };

        const [inputTokens, outputTokens, totalTokens, tokenCost] = await Promise.all([
            this.getMetricSum("PRD_InputTokens", [], timeRange),
            this.getMetricSum("PRD_OutputTokens", [], timeRange),
            this.getMetricSum("PRD_TotalTokens", [], timeRange),
            this.getMetricSum("PRD_TokenCost", [], timeRange),
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

    async getAllPRDMetrics(startTime: Date, endTime: Date): Promise<PRDMetricsStats> {
        const [
            requestCount,
            successRate,
            averageDuration,
            featureCount,
            screenCount,
            wordCount,
            tokenUsage,
        ] = await Promise.all([
            this.getPRDRequestCount(startTime, endTime),
            this.getPRDSuccessRate(startTime, endTime),
            this.getPRDAverageDuration(startTime, endTime),
            this.getPRDFeatureCount(startTime, endTime),
            this.getPRDScreenCount(startTime, endTime),
            this.getPRDWordCount(startTime, endTime),
            this.getPRDTokenUsage(startTime, endTime),
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

    async getPRDRequestsOverTime(startTime: Date, endTime: Date): Promise<MetricDataResult> {
        return this.getTimeSeriesData({
            startTime,
            endTime,
            metricName: "PRD_Requests",
            namespace: this.namespace,
            stat: "Sum",
            period: 86400, // 1 day aggregation
            label: "PRD Requests Over Time",
        });
    }

    async getPRDFeatureCountOverTime(startTime: Date, endTime: Date): Promise<MetricDataResult> {
        return this.getTimeSeriesData({
            startTime,
            endTime,
            metricName: "PRD_FeatureCount",
            namespace: this.namespace,
            stat: "Sum",
            period: 86400, // 1 day aggregation
            label: "PRD Feature Count Over Time",
        });
    }

    // Get formatted time series data for frontend
    async getPRDTimeSeriesData(
        startTime: Date,
        endTime: Date
    ): Promise<{
        requestsOverTime: { date: string; value: number }[];
        featureCountOverTime: { date: string; value: number }[];
    }> {
        const [requestsData, featureCountData] = await Promise.all([
            this.getPRDRequestsOverTime(startTime, endTime),
            this.getPRDFeatureCountOverTime(startTime, endTime),
        ]);

        return {
            requestsOverTime: this.formatTimeSeriesData(requestsData),
            featureCountOverTime: this.formatTimeSeriesData(featureCountData),
        };
    }
}
