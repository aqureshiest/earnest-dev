import { StandardUnit } from "@aws-sdk/client-cloudwatch";

export const METRICS_CONFIG = {
    namespace: process.env.METRICS_NAMESPACE || "EarnestAITools/Metrics",
    region: process.env.AWS_REGION || "us-east-1",
    // metricsEnabled: process.env.METRICS_ENABLED === "true",
    loggingEnabled: process.env.METRICS_LOGGING_ENABLED === "true",
};

export interface MetricDimensions {
    [key: string]: string;
}

export interface MetricParams {
    name: string;
    value: number;
    dimensions?: MetricDimensions;
    unit?: StandardUnit;
}

export interface CodeGenMetricsParams {
    owner: string;
    repo: string;
}

export interface TokenUsageParams extends CodeGenMetricsParams {
    inputTokens: number;
    outputTokens: number;
    cost: number;
}

export interface CodeGenerationParams extends CodeGenMetricsParams {
    linesOfCode: number;
    newFiles: number;
    modifiedFiles: number;
    deletedFiles: number;
}

export interface ImplementationStepsParams extends CodeGenMetricsParams {
    stepCount: number;
    completedSteps: number;
}

export interface PRDStatsParams {
    featureCount: number;
    screenCount: number;
    wordCount: number;
    inputTokens: number;
    outputTokens: number;
    cost: number;
}
