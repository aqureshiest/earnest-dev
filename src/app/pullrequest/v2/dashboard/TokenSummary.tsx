import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TokenSummaryProps {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    tokenCost: number;
    loading?: boolean;
}

export function TokenSummary({
    inputTokens,
    outputTokens,
    totalTokens,
    tokenCost,
    loading = false,
}: TokenSummaryProps) {
    // Calculate percentages
    const inputPercentage = totalTokens > 0 ? (inputTokens / totalTokens) * 100 : 0;
    const outputPercentage = totalTokens > 0 ? (outputTokens / totalTokens) * 100 : 0;

    // Calculate token efficiency (output tokens per input token)
    const tokenEfficiency = inputTokens > 0 ? outputTokens / inputTokens : 0;

    // Calculate cost per token
    const costPerThousandTokens = totalTokens > 0 ? (tokenCost / totalTokens) * 1000 : 0;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Token Usage Summary</CardTitle>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="space-y-2">
                        <div className="h-4 w-full animate-pulse rounded-md bg-gray-200 dark:bg-gray-700" />
                        <div className="h-4 w-3/4 animate-pulse rounded-md bg-gray-200 dark:bg-gray-700" />
                        <div className="h-4 w-1/2 animate-pulse rounded-md bg-gray-200 dark:bg-gray-700" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm font-medium mb-1">Token Distribution</p>
                            <div className="h-3 w-full bg-gray-200 rounded-full dark:bg-gray-700 overflow-hidden">
                                <div
                                    className="h-full bg-blue-600 rounded-full"
                                    style={{ width: `${inputPercentage}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-xs mt-1">
                                <span>Input: {inputPercentage.toFixed(1)}%</span>
                                <span>Output: {outputPercentage.toFixed(1)}%</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm font-medium">Token Efficiency</p>
                                <p className="text-lg font-bold">{tokenEfficiency.toFixed(2)}</p>
                                <p className="text-xs text-muted-foreground">
                                    Output tokens per input token
                                </p>
                            </div>
                            <div>
                                <p className="text-sm font-medium">Cost per 1K Tokens</p>
                                <p className="text-lg font-bold">
                                    ${costPerThousandTokens.toFixed(4)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Average cost for 1,000 tokens
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
