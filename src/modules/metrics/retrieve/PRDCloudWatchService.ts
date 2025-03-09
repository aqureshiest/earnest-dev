import { BaseCloudWatchService } from "./BaseCloudwatchService";
import { PRDMetricsStats, TokenUsageStats, MetricDataResult } from "./types";
import { METRICS_CONFIG } from "../generate/config";

export class PRDCloudWatchService extends BaseCloudWatchService {
    constructor(namespace?: string) {
        super(namespace ? namespace : METRICS_CONFIG.namespace);
    }

    async getPRDRequestCount(): Promise<number> {
        return this.getMetricSum("PRD_Requests");
    }

    async getPRDSuccessRate(): Promise<number> {
        const timeRange = this.getDefaultTimeRange();
        const totalRequests = await this.getMetricSum("PRD_Requests", [], timeRange);
        const totalSuccesses = await this.getMetricSum("PRD_Success", [], timeRange);

        // Calculate success rate percentage
        if (totalRequests === 0) {
            return 0;
        }

        return (totalSuccesses / totalRequests) * 100;
    }

    async getPRDAverageDuration(): Promise<number> {
        return this.getMetricAverage("PRD_Duration");
    }

    async getPRDFeatureCount(): Promise<number> {
        return this.getMetricSum("PRD_FeatureCount");
    }

    async getPRDScreenCount(): Promise<number> {
        return this.getMetricSum("PRD_ScreenCount");
    }

    async getPRDWordCount(): Promise<number> {
        return this.getMetricSum("PRD_WordCount");
    }

    async getPRDTokenUsage(): Promise<TokenUsageStats> {
        const timeRange = this.getDefaultTimeRange();

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

    async getAllPRDMetrics(): Promise<PRDMetricsStats> {
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
