import { StandardUnit } from "@aws-sdk/client-cloudwatch";
import { PRDStatsParams } from "./config";
import { BaseMetricsService } from "./BaseMetricsService";

export class PRDMetricsService extends BaseMetricsService {
    async trackRequest(): Promise<void> {
        await this.trackMetric({
            name: "PRD_Requests",
            value: 1,
        });
    }

    async trackSuccess(success: boolean): Promise<void> {
        await this.trackMetric({
            name: "PRD_Success",
            value: success ? 1 : 0,
        });
    }

    async trackDuration(durationMs: number): Promise<void> {
        await this.trackMetric({
            name: "PRD_Duration",
            value: durationMs,
            unit: StandardUnit.Milliseconds,
        });
    }

    async trackStats({
        featureCount,
        screenCount,
        wordCount,
        inputTokens,
        outputTokens,
        cost,
    }: PRDStatsParams): Promise<void> {
        // Track complexity metrics
        await this.trackMetric({
            name: "PRD_FeatureCount",
            value: featureCount,
        });

        await this.trackMetric({
            name: "PRD_ScreenCount",
            value: screenCount,
        });

        await this.trackMetric({
            name: "PRD_WordCount",
            value: wordCount,
        });

        // Track token usage
        await this.trackMetric({
            name: "PRD_InputTokens",
            value: inputTokens,
        });

        await this.trackMetric({
            name: "PRD_OutputTokens",
            value: outputTokens,
        });

        await this.trackMetric({
            name: "PRD_TotalTokens",
            value: inputTokens + outputTokens,
        });

        await this.trackMetric({
            name: "PRD_TokenCost",
            value: cost,
            unit: StandardUnit.None,
        });
    }
}
