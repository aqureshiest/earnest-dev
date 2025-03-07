"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Code2,
    GitPullRequest,
    BarChart3,
    CheckCircle,
    MessageSquare,
    Database,
    DollarSign,
    LineChart,
    GitBranch,
} from "lucide-react";
import { DashboardFooter } from "./Footer";
import { DashboardHeader } from "./Header";
import { MetricCard } from "./MetricCard";
import { SectionHeader } from "./SectionHeader";

interface MetricsData {
    totalRequests: number | null;
    successRate: number | null;
    prsCreated: number | null;
    linesOfCode: number | null;
    inputTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
    tokenCost: number | null;
    repositories: string[];
}

export default function DashboardPage() {
    const [metrics, setMetrics] = useState<MetricsData>({
        totalRequests: null,
        successRate: null,
        prsCreated: null,
        linesOfCode: null,
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
        tokenCost: null,
        repositories: [],
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchMetrics() {
            try {
                setLoading(true);
                const response = await fetch("/api/generate/v2/metrics");

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || "Failed to fetch metrics");
                }

                const data = await response.json();
                setMetrics({
                    totalRequests: data.totalRequests,
                    successRate: data.successRate,
                    prsCreated: data.prsCreated,
                    linesOfCode: data.linesOfCode,
                    inputTokens: data.inputTokens,
                    outputTokens: data.outputTokens,
                    totalTokens: data.totalTokens,
                    tokenCost: data.tokenCost,
                    repositories: data.repositories || [],
                });
                setError(null);
            } catch (err) {
                console.error("Error fetching metrics:", err);
                setError(
                    `Failed to load metrics data: ${
                        err instanceof Error ? err.message : String(err)
                    }`
                );
            } finally {
                setLoading(false);
            }
        }

        fetchMetrics();
    }, []);

    return (
        <div className="container py-10">
            {/* Add custom animation styles */}
            <style jsx global>{`
                ${DashboardHeader.styles}
            `}</style>

            {/* New Header Component */}
            <DashboardHeader />

            {error && (
                <div className="mb-6 rounded-md bg-red-50 p-4 text-red-800 dark:bg-red-900 dark:text-red-200">
                    <p>{error}</p>
                </div>
            )}

            <SectionHeader title="Key Metrics" icon={<LineChart size={20} />} />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                <MetricCard
                    title="Code Generations"
                    value={metrics.totalRequests?.toLocaleString() || "0"}
                    description="Total number of code generation requests"
                    loading={loading}
                    status="info"
                    icon={<BarChart3 size={20} />}
                />
                <MetricCard
                    title="Success Rate"
                    value={metrics.successRate ? `${metrics.successRate.toFixed(1)}%` : "0%"}
                    description="Percentage of successful code generation requests"
                    loading={loading}
                    status={
                        metrics.successRate === null
                            ? "info"
                            : metrics.successRate >= 90
                            ? "positive"
                            : metrics.successRate >= 70
                            ? "warning"
                            : "negative"
                    }
                    icon={<CheckCircle size={20} />}
                />
                <MetricCard
                    title="PRs Created"
                    value={metrics.prsCreated?.toLocaleString() || "0"}
                    description="Number of pull requests created"
                    loading={loading}
                    status="positive"
                    icon={<GitPullRequest size={20} />}
                />
                <MetricCard
                    title="Lines of Code Generated"
                    value={metrics.linesOfCode?.toLocaleString() || "0"}
                    description="Total lines of code generated"
                    loading={loading}
                    status="info"
                    icon={<Code2 size={20} />}
                />
            </div>

            <SectionHeader title="Token Usage & Cost" icon={<DollarSign size={20} />} />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                <MetricCard
                    title="Input Tokens"
                    value={metrics.inputTokens?.toLocaleString() || "0"}
                    description="Total input tokens used for generation"
                    loading={loading}
                    status="info"
                    icon={<MessageSquare size={20} />}
                />
                <MetricCard
                    title="Output Tokens"
                    value={metrics.outputTokens?.toLocaleString() || "0"}
                    description="Total output tokens generated"
                    loading={loading}
                    status="info"
                    icon={<Database size={20} />}
                />
                <MetricCard
                    title="Total Tokens"
                    value={metrics.totalTokens?.toLocaleString() || "0"}
                    description="Total tokens (input + output)"
                    loading={loading}
                    status="info"
                    icon={<Database size={20} />}
                />
                <MetricCard
                    title="Token Cost"
                    value={metrics.tokenCost ? `${metrics.tokenCost.toFixed(2)}` : "$0.00"}
                    description="Total estimated cost of token usage"
                    loading={loading}
                    status="warning"
                    icon={<DollarSign size={20} />}
                />
            </div>

            {metrics.repositories.length > 0 && (
                <>
                    <SectionHeader title="Repositories" icon={<GitBranch size={20} />} />
                    <Card className="mb-8">
                        <CardContent className="pt-6">
                            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {metrics.repositories.map((repo) => (
                                    <li key={repo} className="flex items-center">
                                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                        {repo}
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                </>
            )}

            <DashboardFooter />
        </div>
    );
}
