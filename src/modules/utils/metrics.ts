import { CloudWatchClient, PutMetricDataCommand } from "@aws-sdk/client-cloudwatch";

const cloudWatch = new CloudWatchClient({
    region: process.env.AWS_REGION || "us-east-1",
});
const namespace = process.env.METRICS_NAMESPACE || "EarnestAI/CodeGenerator";

import { StandardUnit } from "@aws-sdk/client-cloudwatch";

export async function trackMetric(
    metricName: string,
    value: number,
    dimensions?: { [key: string]: string },
    unit: StandardUnit = StandardUnit.Count
) {
    try {
        const dimensionsArray = dimensions
            ? Object.entries(dimensions).map(([Name, Value]) => ({ Name, Value }))
            : [];

        const command = new PutMetricDataCommand({
            Namespace: namespace,
            MetricData: [
                {
                    MetricName: metricName,
                    Value: value,
                    Unit: unit,
                    Dimensions: dimensionsArray,
                    Timestamp: new Date(),
                },
            ],
        });

        await cloudWatch.send(command);
    } catch (error) {
        // Silently fail - we don't want metrics to break the app
        // console.error("Metrics error:", error);
    }
}

// Common metrics functions
export async function trackRequest(owner: string, repo: string) {
    await trackMetric("Requests", 1, { Repository: `${owner}/${repo}` });
}

export async function trackSuccess(owner: string, repo: string, success: boolean) {
    await trackMetric("Success", success ? 1 : 0, { Repository: `${owner}/${repo}` });
}

export async function trackPRCreation(owner: string, repo: string, fileCount: number) {
    await trackMetric("PRsCreated", 1, { Repository: `${owner}/${repo}` });
    await trackMetric("FilesModified", fileCount, { Repository: `${owner}/${repo}` });
}

export async function trackDuration(owner: string, repo: string, durationMs: number) {
    await trackMetric("ProcessingTime", durationMs, { Repository: `${owner}/${repo}` });
}

// New effectiveness metrics
export async function trackCodeGeneration(
    owner: string,
    repo: string,
    linesOfCode: number,
    newFiles: number,
    modifiedFiles: number,
    deletedFiles: number
) {
    // Track lines of code generated
    await trackMetric("LinesOfCode", linesOfCode, { Repository: `${owner}/${repo}` });

    // Track file operations in more detail
    await trackMetric("NewFiles", newFiles, { Repository: `${owner}/${repo}` });
    await trackMetric("ModifiedFiles", modifiedFiles, { Repository: `${owner}/${repo}` });
    await trackMetric("DeletedFiles", deletedFiles, { Repository: `${owner}/${repo}` });

    // Calculate and track code change density (lines per file)
    const totalFiles = newFiles + modifiedFiles;
    if (totalFiles > 0) {
        const codeChangeDensity = linesOfCode / totalFiles;
        await trackMetric("CodeChangeDensity", codeChangeDensity, {
            Repository: `${owner}/${repo}`,
        });
    }
}

export async function trackTokenUsage(
    owner: string,
    repo: string,
    inputTokens: number,
    outputTokens: number,
    cost: number
) {
    await trackMetric("InputTokens", inputTokens, { Repository: `${owner}/${repo}` });
    await trackMetric("OutputTokens", outputTokens, { Repository: `${owner}/${repo}` });
    await trackMetric("TotalTokens", inputTokens + outputTokens, {
        Repository: `${owner}/${repo}`,
    });
    await trackMetric("TokenCost", cost, { Repository: `${owner}/${repo}` }, StandardUnit.None);
}

export async function trackImplementationSteps(
    owner: string,
    repo: string,
    stepCount: number,
    completedSteps: number
) {
    await trackMetric("ImplementationSteps", stepCount, { Repository: `${owner}/${repo}` });
    await trackMetric("CompletedSteps", completedSteps, { Repository: `${owner}/${repo}` });

    // Calculate and track completion percentage
    if (stepCount > 0) {
        const completionPercentage = (completedSteps / stepCount) * 100;
        await trackMetric(
            "StepCompletionRate",
            completionPercentage,
            { Repository: `${owner}/${repo}` },
            StandardUnit.Percent
        );
    }
}
