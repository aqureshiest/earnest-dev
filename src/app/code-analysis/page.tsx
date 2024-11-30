"use client";

import React, { useState } from "react";
import ProgressFeed from "../components/ProgressFeed";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Code2, Database, LineChart, Loader2, Settings2, ShieldCheck, Zap } from "lucide-react";
import { motion } from "framer-motion";
import AnalysisResults from "../components/AnalysisResults";
import RepoAndBranchSelection from "../components/RepoAndBranchSelection";
import AIModelSelection from "../components/AIModelSelection";

const ANALYSIS_TYPES = [
    {
        key: "resiliency",
        label: "Resiliency",
        description: "Evaluate system resilience and fault tolerance",
        icon: ShieldCheck,
    },
    {
        key: "security",
        label: "Security Vulnerabilities",
        description: "Identify potential security risks and vulnerabilities",
        icon: Settings2,
    },
    {
        key: "performance",
        label: "Performance",
        description: "Analyze code performance and optimization opportunities",
        icon: Zap,
    },
    {
        key: "api",
        label: "API Design",
        description: "Review API design patterns and best practices",
        icon: Code2,
    },
    {
        key: "data",
        label: "Data Patterns",
        description: "Examine data handling and storage patterns",
        icon: Database,
    },
    {
        key: "code-maintain",
        label: "Code Maintainability",
        description: "Assess code quality and maintainability",
        icon: LineChart,
    },
];

interface AnalysisData {
    type: string;
    taskId: string;
    message: AnalysisResult;
}

interface AnalysisResult {
    analysisType: string;
    response: AnalysisResponse;
}

const CodeAnalysisPage: React.FC = () => {
    const [taskId, setTaskId] = useState("");
    const [repo, setRepo] = useState("");
    const [branch, setBranch] = useState("");

    const [selectedModel, setSelectedModel] = useState<string>("");

    const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);

    const [analyzing, setAnalyzing] = useState(false);
    const [isComplete, setIsComplete] = useState(false);

    const [progress, setProgress] = useState<string[]>([]);

    const owner = process.env.NEXT_PUBLIC_GITHUB_OWNER!;

    const handleAnalyze = async () => {
        setAnalyzing(true);
        const newTaskId = Date.now().toString();
        setTaskId(newTaskId);
        resetState();

        try {
            setProgress((prev) => [...prev, `Task ${newTaskId} started`]);

            const request = {
                taskId: newTaskId,
                owner,
                repo,
                branch,
                selectedModel,
                analysisTypes: Array.from(selectedTypes),
            };

            const response = await fetch("/api/code-analysis", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(request),
            });

            if (!response.ok) {
                throw new Error(`Task failed: ${response.statusText}`);
            }

            // Listen for stream response
            await handleStreamResponse(response);
        } catch (error: any) {
            console.error("Error during ticket generation:", error);
            setProgress((prev) => [...prev, `Error: ${error.message}`]);
        } finally {
            setAnalyzing(false);
        }
    };

    const handleStreamResponse = async (response: Response) => {
        const reader = response.body?.getReader();
        if (!reader) throw new Error("Failed to get stream reader");

        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split("\n\n");

            for (const line of lines) {
                if (line.startsWith("data: ")) {
                    const data = JSON.parse(line.slice(6));
                    handleResponseData(data);
                }
            }
        }
    };

    const handleResponseData = (data: any) => {
        switch (data.type) {
            case "progress":
                handleProgress(data);
                break;
            case "error":
                handleError(new Error(data.message));
                break;
            case "complete":
                handleComplete(data);
                break;
            case "final":
                handleFinal(data);
                break;
        }
    };

    const handleProgress = (data: any) => {
        setProgress((prev) => [...prev, data.message]);
    };

    const handleComplete = (data: AnalysisData) => {
        console.log("Analysis complete:", data);
        setAnalysisResults((prev) => [...prev, data.message]);
    };

    const handleFinal = (data: any) => {
        // setProgress((prev) => [...prev, data.message]);
        setIsComplete(true);
    };

    const handleError = (error: Error) => {
        console.error(error);
        setProgress((prev) => [...prev, error.message]);
    };

    const resetState = () => {
        setProgress([]);
        setAnalysisResults([]);
        setIsComplete(false);
    };

    const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());

    const handleTypeToggle = (type: string) => {
        setSelectedTypes((prev) => {
            const newSelected = new Set(prev);
            if (newSelected.has(type)) {
                newSelected.delete(type);
            } else {
                newSelected.add(type);
            }
            return newSelected;
        });
    };

    return (
        <div className="min-h-screen py-8 px-6">
            <div className="max-w-7xl mx-auto">
                <motion.h1
                    className="text-3xl font-semibold text-center mb-8 text-gray-800 dark:text-gray-100"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    Code Analysis Dashboard
                </motion.h1>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
                    {/* Left Column: Combined Form */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        <Card className="shadow-lg">
                            <CardHeader>
                                <CardTitle>Analysis Configuration</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6">
                                    {/* Repository and Branch Section */}
                                    <div className="space-y-4">
                                        <RepoAndBranchSelection
                                            repo={repo}
                                            branch={branch}
                                            setRepo={setRepo}
                                            setBranch={setBranch}
                                            loading={analyzing}
                                        />

                                        <AIModelSelection
                                            selectedModel={selectedModel}
                                            setSelectedModel={setSelectedModel}
                                            loading={analyzing}
                                        />
                                    </div>

                                    {/* Visual Separator */}
                                    {/* <div className="border-t border-gray-200 dark:border-gray-700 my-6"></div> */}

                                    {/* Analysis Types Section */}
                                    <div>
                                        <h3 className="text-lg font-semibold mb-4">
                                            Analysis Types
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {ANALYSIS_TYPES.map(
                                                ({ key, label, description, icon: Icon }) => (
                                                    <div
                                                        key={key}
                                                        onClick={() => handleTypeToggle(key)}
                                                        className={`cursor-pointer p-3 border rounded-lg flex items-start space-x-3 transition-colors duration-200 ${
                                                            selectedTypes.has(key)
                                                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900"
                                                                : "border-gray-200 dark:border-gray-700 hover:border-blue-300"
                                                        }`}
                                                    >
                                                        <Icon className="h-5 w-5 text-blue-500 mt-0.5" />
                                                        <div>
                                                            <p className="text-sm font-medium">
                                                                {label}
                                                            </p>
                                                            <p className="text-xs text-gray-600 dark:text-gray-400">
                                                                {description}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </div>

                                    <Button
                                        onClick={handleAnalyze}
                                        disabled={
                                            analyzing ||
                                            !repo ||
                                            !branch ||
                                            selectedTypes.size === 0
                                        }
                                        className="w-full mt-6"
                                    >
                                        {analyzing ? (
                                            <Loader2 className="animate-spin mr-2 h-4 w-4" />
                                        ) : (
                                            "Analyze Code"
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Right Column: Progress Feed */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="h-full"
                    >
                        <ProgressFeed progress={progress} />
                    </motion.div>
                </div>

                {/* Analysis Results */}
                {analysisResults.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="h-full"
                    >
                        <AnalysisResults results={analysisResults} repo={repo} branch={branch} />
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default CodeAnalysisPage;
