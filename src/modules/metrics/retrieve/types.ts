export interface TimeRange {
    startTime: Date;
    endTime: Date;
}

export interface MetricDataResult {
    label: string;
    values: number[];
    timestamps: Date[];
}

export interface TokenUsageStats {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    tokenCost: number;
}

export interface PRDMetricsStats {
    requestCount: number;
    successRate: number;
    averageDuration: number;
    featureCount: number;
    screenCount: number;
    wordCount: number;
    tokenUsage: TokenUsageStats;
}

export interface CodeGenMetricsStats {
    totalRequests: number;
    successRate: number;
    prsCreated: number;
    linesOfCode: number;
    tokenUsage: TokenUsageStats;
    repositories: string[];
}

export interface TimeSeriesParams {
    startTime: Date;
    endTime: Date;
    metricName: string;
    namespace: string;
    dimensions?: { Name: string; Value: string }[];
    stat: string;
    period: number;
    label?: string;
}
