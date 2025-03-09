"use client";

import React, { useState, useEffect } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    BarChart,
    Bar,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    Code2,
    GitPullRequest,
    BarChart3,
    CheckCircle,
    MessageSquare,
    Database,
    DollarSign,
    LineChart as LineChartIcon,
    GitBranch,
} from "lucide-react";

interface TokenUsage {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    tokenCost: number;
}

interface TimeSeriesData {
    date: string;
    value: number;
}

interface DashboardData {
    totalRequests: number;
    successRate: number;
    prsCreated: number;
    linesOfCode: number;
    tokenUsage: TokenUsage;
    repositories: string[];
    timeSeriesData: {
        requestsOverTime: TimeSeriesData[];
        successRateOverTime: TimeSeriesData[];
        linesOfCodeOverTime: TimeSeriesData[];
        prsCreatedOverTime: TimeSeriesData[];
    };
}

// Metric card component using shadcn UI
const MetricCard: React.FC<{
    title: string;
    value: string | number;
    description: string;
    icon?: React.ReactNode;
    status?: "info" | "positive" | "warning" | "negative";
}> = ({ title, value, description, icon, status = "info" }) => {
    // Determine the color based on status
    let statusColor = "text-blue-500";
    if (status === "positive") statusColor = "text-green-500";
    if (status === "warning") statusColor = "text-amber-500";
    if (status === "negative") statusColor = "text-red-500";

    return (
        <Card>
            <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        {title}
                    </CardTitle>
                    {icon && <div className={statusColor}>{icon}</div>}
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground mt-1">{description}</p>
            </CardContent>
        </Card>
    );
};

export default function DashboardPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<DashboardData | null>(null);

    useEffect(() => {
        async function fetchMetrics() {
            try {
                setLoading(true);
                const response = await fetch("/api/generate/v2/metrics");

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || "Failed to fetch metrics");
                }

                const metricsData = await response.json();
                setData(metricsData);
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

    if (loading) {
        return (
            <div className="space-y-4 p-8">
                <Skeleton className="h-12 w-1/3" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i}>
                            <CardHeader>
                                <Skeleton className="h-5 w-1/2" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-10 w-1/3" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <Skeleton className="h-5 w-1/2" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-64 w-full" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <Skeleton className="h-5 w-1/2" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-64 w-full" />
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8">
                <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="p-8">
                <Alert>
                    <AlertTitle>No Data Available</AlertTitle>
                    <AlertDescription>
                        No metrics data is currently available. New data may take time to appear or
                        there may be no code generation activity yet.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Code Generation Dashboard</h1>
                <p className="text-muted-foreground">Track performance and usage statistics</p>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="token-usage">Token Usage</TabsTrigger>
                    <TabsTrigger value="repositories">Repositories</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <MetricCard
                            title="Code Generations"
                            value={data.totalRequests?.toLocaleString() || "0"}
                            description="Total number of code generation requests"
                            status="info"
                            icon={<BarChart3 size={20} />}
                        />
                        <MetricCard
                            title="Success Rate"
                            value={data.successRate ? `${data.successRate.toFixed(1)}%` : "0%"}
                            description="Percentage of successful code generation requests"
                            status={
                                data.successRate === null
                                    ? "info"
                                    : data.successRate >= 90
                                    ? "positive"
                                    : data.successRate >= 70
                                    ? "warning"
                                    : "negative"
                            }
                            icon={<CheckCircle size={20} />}
                        />
                        <MetricCard
                            title="PRs Created"
                            value={data.prsCreated?.toLocaleString() || "0"}
                            description="Number of pull requests created"
                            status="positive"
                            icon={<GitPullRequest size={20} />}
                        />
                        <MetricCard
                            title="Lines of Code Generated"
                            value={data.linesOfCode?.toLocaleString() || "0"}
                            description="Total lines of code generated"
                            status="info"
                            icon={<Code2 size={20} />}
                        />
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Requests Over Time Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Code Generation Requests Over Time</CardTitle>
                                <CardDescription>
                                    Number of code generation requests by day
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={data.timeSeriesData.requestsOverTime}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="date" />
                                            <YAxis />
                                            <Tooltip />
                                            <Legend />
                                            <Line
                                                type="monotone"
                                                dataKey="value"
                                                stroke="#8884d8"
                                                strokeWidth={2}
                                                name="Requests"
                                                dot={{ strokeWidth: 2 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Success Rate Over Time Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Success Rate Over Time</CardTitle>
                                <CardDescription>
                                    Percentage of successful code generations by day
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={data.timeSeriesData.successRateOverTime}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="date" />
                                            <YAxis domain={[0, 100]} />
                                            <Tooltip
                                                formatter={(value) => [
                                                    `${Number(value).toFixed(1)}%`,
                                                    "Success Rate",
                                                ]}
                                            />
                                            <Legend />
                                            <Line
                                                type="monotone"
                                                dataKey="value"
                                                stroke="#82ca9d"
                                                strokeWidth={2}
                                                name="Success Rate"
                                                dot={{ strokeWidth: 2 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Second Row of Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Lines of Code Over Time Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Lines of Code Generated</CardTitle>
                                <CardDescription>
                                    Total lines of code generated by day
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={data.timeSeriesData.linesOfCodeOverTime}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="date" />
                                            <YAxis />
                                            <Tooltip
                                                formatter={(value) => [
                                                    value.toLocaleString(),
                                                    "Lines",
                                                ]}
                                            />
                                            <Legend />
                                            <Bar
                                                dataKey="value"
                                                fill="#ff7c43"
                                                name="Lines of Code"
                                                radius={[4, 4, 0, 0]}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* PRs Created Over Time Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Pull Requests Created</CardTitle>
                                <CardDescription>
                                    Number of pull requests created by day
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={data.timeSeriesData.prsCreatedOverTime}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="date" />
                                            <YAxis />
                                            <Tooltip />
                                            <Legend />
                                            <Bar
                                                dataKey="value"
                                                fill="#2a9d8f"
                                                name="Pull Requests"
                                                radius={[4, 4, 0, 0]}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="token-usage" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <MetricCard
                            title="Input Tokens"
                            value={data.tokenUsage.inputTokens.toLocaleString()}
                            description="Total tokens used for prompts"
                            icon={<MessageSquare size={20} />}
                        />
                        <MetricCard
                            title="Output Tokens"
                            value={data.tokenUsage.outputTokens.toLocaleString()}
                            description="Total tokens generated in responses"
                            icon={<Database size={20} />}
                        />
                        <MetricCard
                            title="Token Cost"
                            value={`$${data.tokenUsage.tokenCost.toFixed(2)}`}
                            description="Estimated total cost"
                            icon={<DollarSign size={20} />}
                            status="warning"
                        />
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Token Usage Analysis</CardTitle>
                            <CardDescription>Breakdown of token usage metrics</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[400px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={[
                                            {
                                                name: "Input Tokens",
                                                value: data.tokenUsage.inputTokens,
                                            },
                                            {
                                                name: "Output Tokens",
                                                value: data.tokenUsage.outputTokens,
                                            },
                                            {
                                                name: "Total Tokens",
                                                value: data.tokenUsage.totalTokens,
                                            },
                                        ]}
                                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip
                                            formatter={(value) => [
                                                value.toLocaleString(),
                                                "Tokens",
                                            ]}
                                        />
                                        <Legend />
                                        <Bar dataKey="value" fill="#8884d8" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                        <CardFooter className="text-sm text-muted-foreground">
                            Estimated token cost: ${data.tokenUsage.tokenCost.toFixed(2)}
                        </CardFooter>
                    </Card>
                </TabsContent>

                <TabsContent value="repositories" className="space-y-4">
                    {data.repositories.length > 0 ? (
                        <>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Active Repositories</CardTitle>
                                    <CardDescription>
                                        Repositories using the code generation service
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {data.repositories.map((repo) => (
                                            <li
                                                key={repo}
                                                className="flex items-center p-2 rounded-md bg-muted/50"
                                            >
                                                <GitBranch
                                                    size={16}
                                                    className="mr-2 text-green-500"
                                                />
                                                <span className="font-mono text-sm">{repo}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                                <CardFooter>
                                    <p className="text-sm text-muted-foreground">
                                        Total repositories: {data.repositories.length}
                                    </p>
                                </CardFooter>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Repository Distribution</CardTitle>
                                    <CardDescription>
                                        Visualization of repository count
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart
                                                data={[
                                                    {
                                                        name: "Repositories",
                                                        value: data.repositories.length,
                                                    },
                                                ]}
                                                layout="vertical"
                                            >
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis type="number" />
                                                <YAxis type="category" dataKey="name" />
                                                <Tooltip />
                                                <Bar
                                                    dataKey="value"
                                                    fill="#1e40af"
                                                    radius={[0, 4, 4, 0]}
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    ) : (
                        <Alert>
                            <AlertTitle>No Repositories</AlertTitle>
                            <AlertDescription>
                                No repositories are currently using the code generation service.
                            </AlertDescription>
                        </Alert>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
