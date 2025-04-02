import { StandardUnit } from "@aws-sdk/client-cloudwatch";
import { CodeGenMetricsParams, TokenUsageParams } from "./config";
import { BaseMetricsService } from "./BaseMetricsService";

export interface CodebaseQAMetricsParams extends CodeGenMetricsParams {
    questionType?: "general" | "specific";
    filesAnalyzed?: number;
    isConversation?: boolean;
    hasConversationHistory?: boolean;
}

export interface QATokenUsageParams extends TokenUsageParams {
    questionType?: "general" | "specific";
}

export class CodebaseQAMetricsService extends BaseMetricsService {
    async trackQuestionRequest({
        owner,
        repo,
        questionType,
        filesAnalyzed,
    }: CodebaseQAMetricsParams): Promise<void> {
        // Track question type if provided
        if (questionType) {
            await this.trackMetric({
                name: "QuestionType",
                value: 1,
                dimensions: {
                    Repository: `${owner}/${repo}`,
                    Type: questionType,
                },
            });
        }

        // Track files analyzed if provided
        if (filesAnalyzed !== undefined) {
            await this.trackMetric({
                name: "FilesAnalyzed",
                value: filesAnalyzed,
                dimensions: { Repository: `${owner}/${repo}` },
            });
        }
    }

    async trackQARequest({ owner, repo, isConversation }: CodebaseQAMetricsParams): Promise<void> {
        await this.trackMetric({
            name: "QARequests",
            value: 1,
            dimensions: { Repository: `${owner}/${repo}` },
        });

        // Track if this is part of a conversation
        if (isConversation) {
            await this.trackMetric({
                name: "ConversationQuestions",
                value: 1,
                dimensions: { Repository: `${owner}/${repo}` },
            });
        }
    }

    async trackQASuccess({ owner, repo }: CodeGenMetricsParams, success: boolean): Promise<void> {
        await this.trackMetric({
            name: "QASuccess",
            value: success ? 1 : 0,
            dimensions: { Repository: `${owner}/${repo}` },
        });
    }

    async trackQADuration(
        { owner, repo }: CodeGenMetricsParams,
        durationMs: number
    ): Promise<void> {
        await this.trackMetric({
            name: "QAProcessingTime",
            value: durationMs,
            dimensions: { Repository: `${owner}/${repo}` },
            unit: StandardUnit.Milliseconds,
        });
    }

    async trackQATokenUsage({
        owner,
        repo,
        inputTokens,
        outputTokens,
        cost,
        questionType,
    }: QATokenUsageParams): Promise<void> {
        const dimensions: { Repository: string; Type?: string } = {
            Repository: `${owner}/${repo}`,
        };
        if (questionType) {
            dimensions.Type = questionType;
        }

        await this.trackMetric({
            name: "QAInputTokens",
            value: inputTokens,
            dimensions,
        });

        await this.trackMetric({
            name: "QAOutputTokens",
            value: outputTokens,
            dimensions,
        });

        await this.trackMetric({
            name: "QATotalTokens",
            value: inputTokens + outputTokens,
            dimensions,
        });

        await this.trackMetric({
            name: "QATokenCost",
            value: cost,
            dimensions,
            unit: StandardUnit.None,
        });
    }
}
