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
    PieChart,
    Pie,
    Cell,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface TokenUsage {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    tokenCost: number;
}

interface TimeSeriesData {
    questionsOverTime: { date: string; value: number }[];
    questionTypeDistribution: {
        general: { date: string; value: number }[];
        specific: { date: string; value: number }[];
    };
    processingTimeOverTime: { date: string; value: number }[];
    tokenUsageOverTime: {
        input: { date: string; value: number }[];
        output: { date: string; value: number }[];
    };
    successRateOverTime: { date: string; value: number }[];
}

interface DashboardData {
    totalRequests: number;
    successRate: number;
    generalQuestions: number;
    specificQuestions: number;
    conversationQuestions: number;
    averageFilesAnalyzed: number;
    tokenUsage: TokenUsage;
    repositories: string[];
    timeSeriesData: TimeSeriesData;
}

// Constant for pie chart colors
const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300"];

const CodebaseQADashboard: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<DashboardData | null>(null);

    useEffect(() => {
        const fetchMetricsData = async () => {
            try {
                setLoading(true);
                const response = await fetch("/api/codebase-qa/metrics");

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
                        there may be no codebase Q&A activity yet.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    // Prepare data for question type pie chart
    const questionTypeData = [
        { name: "General", value: data.generalQuestions },
        { name: "Specific", value: data.specificQuestions },
    ];

    // Prepare data for conversation vs. single question
    const conversationData = [
        { name: "With History", value: data.conversationQuestions },
        {
            name: "Single Question",
            value: data.totalRequests - data.conversationQuestions,
        },
    ];

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Codebase Q&A Dashboard</h1>
                <p className="text-muted-foreground">
                    Track performance and usage statistics (last 30 days)
                </p>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="question-analysis">Question Analysis</TabsTrigger>
                    <TabsTrigger value="token-usage">Token Usage</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <MetricCard
                            title="Total Questions"
                            value={data.totalRequests.toLocaleString()}
                            description="Total number of questions asked"
                        />
                        <MetricCard
                            title="Success Rate"
                            value={`${data.successRate.toFixed(1)}%`}
                            description="Percentage of successfully answered questions"
                        />
                        <MetricCard
                            title="Files Analyzed"
                            value={data.averageFilesAnalyzed.toLocaleString(undefined, {
                                maximumFractionDigits: 1,
                            })}
                            description="Average files analyzed per question"
                        />
                        <MetricCard
                            title="Token Cost"
                            value={`$${data.tokenUsage.tokenCost.toFixed(2)}`}
                            description="Estimated total cost"
                        />
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Questions Over Time Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Questions Over Time</CardTitle>
                                <CardDescription>
                                    Number of codebase questions by day
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={data.timeSeriesData.questionsOverTime}>
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
                                                name="Questions"
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
                                    Percentage of successfully answered questions by day
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
                </TabsContent>

                <TabsContent value="question-analysis" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <MetricCard
                            title="General Questions"
                            value={data.generalQuestions.toLocaleString()}
                            description={`${(
                                (data.generalQuestions / data.totalRequests) *
                                100
                            ).toFixed(1)}% of total questions`}
                        />
                        <MetricCard
                            title="Specific Questions"
                            value={data.specificQuestions.toLocaleString()}
                            description={`${(
                                (data.specificQuestions / data.totalRequests) *
                                100
                            ).toFixed(1)}% of total questions`}
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Question Type Distribution */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Question Types</CardTitle>
                                <CardDescription>
                                    Distribution of general vs. specific questions
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={questionTypeData}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={true}
                                                label={({ name, percent }) =>
                                                    `${name}: ${(percent * 100).toFixed(0)}%`
                                                }
                                                outerRadius={100}
                                                fill="#8884d8"
                                                dataKey="value"
                                            >
                                                {questionTypeData.map((entry, index) => (
                                                    <Cell
                                                        key={`cell-${index}`}
                                                        fill={COLORS[index % COLORS.length]}
                                                    />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                formatter={(value) => [
                                                    value.toLocaleString(),
                                                    "Questions",
                                                ]}
                                            />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Conversation Usage */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Conversation Usage</CardTitle>
                                <CardDescription>
                                    Questions with vs. without conversation history
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={conversationData}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={true}
                                                label={({ name, percent }) =>
                                                    `${name}: ${(percent * 100).toFixed(0)}%`
                                                }
                                                outerRadius={100}
                                                fill="#8884d8"
                                                dataKey="value"
                                            >
                                                {conversationData.map((entry, index) => (
                                                    <Cell
                                                        key={`cell-${index}`}
                                                        fill={COLORS[index % COLORS.length]}
                                                    />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                formatter={(value) => [
                                                    value.toLocaleString(),
                                                    "Questions",
                                                ]}
                                            />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Question Type Over Time */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Question Type Distribution Over Time</CardTitle>
                            <CardDescription>General vs. specific questions by day</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                            dataKey="date"
                                            allowDuplicatedCategory={false}
                                            type="category"
                                        />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Line
                                            data={
                                                data.timeSeriesData.questionTypeDistribution.general
                                            }
                                            type="monotone"
                                            dataKey="value"
                                            stroke="#8884d8"
                                            strokeWidth={2}
                                            name="General Questions"
                                            dot={{ strokeWidth: 2 }}
                                        />
                                        <Line
                                            data={
                                                data.timeSeriesData.questionTypeDistribution
                                                    .specific
                                            }
                                            type="monotone"
                                            dataKey="value"
                                            stroke="#82ca9d"
                                            strokeWidth={2}
                                            name="Specific Questions"
                                            dot={{ strokeWidth: 2 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
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

                    <Card>
                        <CardHeader>
                            <CardTitle>Token Usage Over Time</CardTitle>
                            <CardDescription>Input and output tokens by day</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                            dataKey="date"
                                            allowDuplicatedCategory={false}
                                            type="category"
                                        />
                                        <YAxis />
                                        <Tooltip
                                            formatter={(value) => [
                                                value.toLocaleString(),
                                                "Tokens",
                                            ]}
                                        />
                                        <Legend />
                                        <Line
                                            data={data.timeSeriesData.tokenUsageOverTime.input}
                                            type="monotone"
                                            dataKey="value"
                                            stroke="#8884d8"
                                            strokeWidth={2}
                                            name="Input Tokens"
                                        />
                                        <Line
                                            data={data.timeSeriesData.tokenUsageOverTime.output}
                                            type="monotone"
                                            dataKey="value"
                                            stroke="#82ca9d"
                                            strokeWidth={2}
                                            name="Output Tokens"
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
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

export default CodebaseQADashboard;
