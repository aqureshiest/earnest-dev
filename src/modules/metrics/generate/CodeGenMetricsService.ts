import { StandardUnit } from "@aws-sdk/client-cloudwatch";
import {
    CodeGenMetricsParams,
    TokenUsageParams,
    CodeGenerationParams,
    ImplementationStepsParams,
} from "./config";
import { BaseMetricsService } from "./BaseMetricsService";

export class CodeGenMetricsService extends BaseMetricsService {
    async trackRequest({ owner, repo }: CodeGenMetricsParams): Promise<void> {
        await this.trackMetric({
            name: "Requests",
            value: 1,
            dimensions: { Repository: `${owner}/${repo}` },
        });
    }

    async trackSuccess({ owner, repo }: CodeGenMetricsParams, success: boolean): Promise<void> {
        await this.trackMetric({
            name: "Success",
            value: success ? 1 : 0,
            dimensions: { Repository: `${owner}/${repo}` },
        });
    }

    async trackPRCreation({ owner, repo }: CodeGenMetricsParams, fileCount: number): Promise<void> {
        await this.trackMetric({
            name: "PRsCreated",
            value: 1,
            dimensions: { Repository: `${owner}/${repo}` },
        });

        await this.trackMetric({
            name: "FilesModified",
            value: fileCount,
            dimensions: { Repository: `${owner}/${repo}` },
        });
    }

    async trackDuration({ owner, repo }: CodeGenMetricsParams, durationMs: number): Promise<void> {
        await this.trackMetric({
            name: "ProcessingTime",
            value: durationMs,
            dimensions: { Repository: `${owner}/${repo}` },
            unit: StandardUnit.Milliseconds,
        });
    }

    async trackCodeGeneration({
        owner,
        repo,
        linesOfCode,
        newFiles,
        modifiedFiles,
        deletedFiles,
    }: CodeGenerationParams): Promise<void> {
        // Track lines of code generated
        await this.trackMetric({
            name: "LinesOfCode",
            value: linesOfCode,
            dimensions: { Repository: `${owner}/${repo}` },
        });

        // Track file operations in more detail
        await this.trackMetric({
            name: "NewFiles",
            value: newFiles,
            dimensions: { Repository: `${owner}/${repo}` },
        });

        await this.trackMetric({
            name: "ModifiedFiles",
            value: modifiedFiles,
            dimensions: { Repository: `${owner}/${repo}` },
        });

        await this.trackMetric({
            name: "DeletedFiles",
            value: deletedFiles,
            dimensions: { Repository: `${owner}/${repo}` },
        });

        // Calculate and track code change density (lines per file)
        const totalFiles = newFiles + modifiedFiles;
        if (totalFiles > 0) {
            const codeChangeDensity = linesOfCode / totalFiles;
            await this.trackMetric({
                name: "CodeChangeDensity",
                value: codeChangeDensity,
                dimensions: { Repository: `${owner}/${repo}` },
            });
        }
    }

    async trackTokenUsage({
        owner,
        repo,
        inputTokens,
        outputTokens,
        cost,
    }: TokenUsageParams): Promise<void> {
        await this.trackMetric({
            name: "InputTokens",
            value: inputTokens,
            dimensions: { Repository: `${owner}/${repo}` },
        });

        await this.trackMetric({
            name: "OutputTokens",
            value: outputTokens,
            dimensions: { Repository: `${owner}/${repo}` },
        });

        await this.trackMetric({
            name: "TotalTokens",
            value: inputTokens + outputTokens,
            dimensions: { Repository: `${owner}/${repo}` },
        });

        await this.trackMetric({
            name: "TokenCost",
            value: cost,
            dimensions: { Repository: `${owner}/${repo}` },
            unit: StandardUnit.None,
        });
    }

    async trackImplementationSteps({
        owner,
        repo,
        stepCount,
        completedSteps,
    }: ImplementationStepsParams): Promise<void> {
        await this.trackMetric({
            name: "ImplementationSteps",
            value: stepCount,
            dimensions: { Repository: `${owner}/${repo}` },
        });

        await this.trackMetric({
            name: "CompletedSteps",
            value: completedSteps,
            dimensions: { Repository: `${owner}/${repo}` },
        });

        // Calculate and track completion percentage
        if (stepCount > 0) {
            const completionPercentage = (completedSteps / stepCount) * 100;
            await this.trackMetric({
                name: "StepCompletionRate",
                value: completionPercentage,
                dimensions: { Repository: `${owner}/${repo}` },
                unit: StandardUnit.Percent,
            });
        }
    }
}
