"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { ExtensionConfig } from "@/types/extension";
import AIModelSelection from "../AIModelSelection";
import DynamicSchemaViewer from "../DynamicSchemaViewer";
import ProgressFeed from "../ProgressFeed";
import RepoAndBranchSelection from "../RepoAndBranchSelection";

interface ExtensionDetailProps {
    extensionId: string;
    extensionConfig: ExtensionConfig;
}

export default function ExtensionDetail({ extensionId, extensionConfig }: ExtensionDetailProps) {
    const [taskId, setTaskId] = useState("");
    const [repo, setRepo] = useState("");
    const [branch, setBranch] = useState("");
    const [selectedModel, setSelectedModel] = useState<string>("");
    const [analyzing, setAnalyzing] = useState(false);
    const [progress, setProgress] = useState<string[]>([]);
    const [results, setResults] = useState<any>(null);

    const handleAnalyze = async () => {
        setAnalyzing(true);
        const newTaskId = Date.now().toString();
        setTaskId(newTaskId);
        resetState();

        try {
            setProgress((prev) => [...prev, `Task ${newTaskId} started`]);

            const request = {
                taskId: newTaskId,
                extensionId,
                owner: process.env.NEXT_PUBLIC_GITHUB_OWNER,
                repo,
                branch,
                selectedModel,
            };

            const response = await fetch("/api/extension/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(request),
            });

            if (!response.ok) {
                throw new Error(`Task failed: ${response.statusText}`);
            }

            await handleStreamResponse(response);
        } catch (error: any) {
            console.error("Error during analysis:", error);
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
                setProgress((prev) => [...prev, data.message]);
                break;
            case "error":
                setProgress((prev) => [...prev, `Error: ${data.message}`]);
                break;
            case "complete":
                setResults(data.message.results);
                break;
            case "final":
                setProgress((prev) => [...prev, "Analysis completed"]);
                break;
        }
    };

    const resetState = () => {
        setProgress([]);
        setResults(null);
    };

    return (
        <div className="min-h-screen py-8 px-6">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-semibold text-center mb-8">{extensionConfig.name}</h1>

                <p className="text-center mb-8 text-gray-600 dark:text-gray-300">
                    {extensionConfig.description}
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
                    {/* Configuration Card */}
                    <Card className="shadow-lg">
                        <CardHeader>
                            <CardTitle>Analysis Configuration</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
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

                                <Button
                                    onClick={handleAnalyze}
                                    disabled={analyzing || !repo || !branch || !selectedModel}
                                    className="w-full"
                                >
                                    {analyzing ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Analyzing...
                                        </>
                                    ) : (
                                        "Start Analysis"
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Progress Feed */}
                    <ProgressFeed progress={progress} />
                </div>

                {/* Results Section */}
                {results && (
                    <div className="mt-8">
                        <DynamicSchemaViewer
                            data={results}
                            schema={extensionConfig.outputSchema}
                            uiConfig={extensionConfig.uiConfig}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
