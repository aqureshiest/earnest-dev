"use client";

import React, { useEffect, useState } from "react";
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

interface DashboardData {
    requestCount: number;
    successRate: number;
    averageDuration: number;
    featureCount: number;
    screenCount: number;
    wordCount: number;
    tokenUsage: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
        tokenCost: number;
    };
    timeSeriesData: {
        requestsOverTime: { date: string; value: number }[];
        featureCountOverTime: { date: string; value: number }[];
    };
}

const PRDMetricsDashboard: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<DashboardData | null>(null);

    useEffect(() => {
        const fetchMetricsData = async () => {
            try {
                setLoading(true);
                const response = await fetch("/api/prd/metrics");

                if (!response.ok) {
                    throw new Error(
                        `Failed to fetch metrics: ${response.status} ${response.statusText}`
                    );
                }

                const metricsData = await response.json();
                setData(metricsData);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to fetch metrics data");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchMetricsData();
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
                        there may be no PRD activity yet.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">PRD Metrics Dashboard</h1>
                <p className="text-muted-foreground">Track performance and usage statistics</p>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="token-usage">Token Usage</TabsTrigger>
                    <TabsTrigger value="content-metrics">Content Metrics</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <MetricCard
                            title="Total PRD Requests"
                            value={data.requestCount.toLocaleString()}
                            description="Total number of PRD generation requests"
                        />
                        <MetricCard
                            title="Success Rate"
                            value={`${data.successRate.toFixed(1)}%`}
                            description="Percentage of successful PRD generations"
                        />
                        <MetricCard
                            title="Avg Duration"
                            value={`${(data.averageDuration / 1000).toFixed(2)}s`}
                            description="Average PRD generation time"
                        />
                        <MetricCard
                            title="Total Token Cost"
                            value={`$${data.tokenUsage.tokenCost.toFixed(2)}`}
                            description="Estimated cost of all PRD generations"
                        />
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Requests Over Time Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle>PRD Requests Over Time</CardTitle>
                                <CardDescription>
                                    Number of PRD generation requests by day
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

                        {/* Feature Count Over Time Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle>PRD Feature Count</CardTitle>
                                <CardDescription>
                                    Number of features included in PRDs by day
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={data.timeSeriesData.featureCountOverTime}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="date" />
                                            <YAxis />
                                            <Tooltip />
                                            <Legend />
                                            <Bar
                                                dataKey="value"
                                                fill="#82ca9d"
                                                name="Features"
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
                        />
                        <MetricCard
                            title="Output Tokens"
                            value={data.tokenUsage.outputTokens.toLocaleString()}
                            description="Total tokens generated in responses"
                        />
                        <MetricCard
                            title="Token Cost"
                            value={`$${data.tokenUsage.tokenCost.toFixed(2)}`}
                            description="Estimated total cost"
                        />
                    </div>
                </TabsContent>

                <TabsContent value="content-metrics" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <MetricCard
                            title="Feature Count"
                            value={data.featureCount.toLocaleString()}
                            description="Total features described in PRDs"
                        />
                        <MetricCard
                            title="Screen Count"
                            value={data.screenCount.toLocaleString()}
                            description="Total UI screens described in PRDs"
                        />
                        <MetricCard
                            title="Word Count"
                            value={data.wordCount.toLocaleString()}
                            description="Total words generated in PRDs"
                        />
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Content Complexity Analysis</CardTitle>
                            <CardDescription>Breakdown of PRD complexity metrics</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[400px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={[
                                            { name: "Features", value: data.featureCount },
                                            { name: "Screens", value: data.screenCount },
                                            { name: "Words (÷100)", value: data.wordCount / 100 },
                                        ]}
                                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip
                                            formatter={(value, name) => {
                                                if (name === "Words (÷100)") {
                                                    return [
                                                        typeof value === "number"
                                                            ? (value * 100).toLocaleString()
                                                            : value,
                                                        "Words",
                                                    ];
                                                }
                                                return [value.toLocaleString(), name];
                                            }}
                                        />
                                        <Legend />
                                        <Bar dataKey="value" fill="#82ca9d" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                        <CardFooter className="text-sm text-muted-foreground">
                            Note: Word count is divided by 100 to fit on the same scale as other
                            metrics
                        </CardFooter>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

// Metric card component using shadcn UI
const MetricCard: React.FC<{
    title: string;
    value: string | number;
    description: string;
}> = ({ title, value, description }) => (
    <Card>
        <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </CardContent>
    </Card>
);

export default PRDMetricsDashboard;
