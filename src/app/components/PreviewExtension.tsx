import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Play, Eye } from "lucide-react";
import { ExtensionConfig } from "@/modules/ai/extensions/types";
import ProgressFeed from "./ProgressFeed";
import { LLM_MODELS } from "@/modules/utils/llmInfo";
import { VisualizationConfig } from "@/modules/ai/extensions/OutputVisualizationGenerator";
import VisualizationRenderer from "./VisualizationRenderer";
import JsonViewer from "./JsonViewer";

interface PreviewExtensionProps {
    config: ExtensionConfig;
    disabled?: boolean;
}

const PreviewExtension: React.FC<PreviewExtensionProps> = ({ config, disabled }) => {
    const [showPreview, setShowPreview] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [progress, setProgress] = useState<string[]>([]);
    const [visualizationConfig, setVisualizationConfig] = useState<VisualizationConfig | null>(
        null
    );
    const [viewMode, setViewMode] = useState<"raw" | "formatted">("raw");

    const generateVisualization = async () => {
        try {
            const response = await fetch("/api/extension/generate-visualization", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ config }),
            });

            if (!response.ok) {
                throw new Error("Failed to generate visualization configuration");
            }

            const vizConfig = await response.json();
            setVisualizationConfig(vizConfig);
        } catch (error) {
            console.error("Failed to generate visualization:", error);
            setProgress((prev) => [...prev, "Failed to generate visualization configuration"]);
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
                    try {
                        const data = JSON.parse(line.slice(6));
                        handleResponseData(data);
                    } catch (e) {
                        console.error("Error parsing SSE message:", e);
                    }
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
                setVisualizationConfig(null);
                break;
            case "complete":
                // Reset visualization config when new results arrive
                setVisualizationConfig(null);
                const parsedResult =
                    typeof data.message.results === "string"
                        ? JSON.parse(data.message.results)
                        : data.message.results;
                setResult(parsedResult);
                // Automatically generate visualization but don't show it yet
                generateVisualization();
                break;
            case "final":
                setProgress((prev) => [...prev, data.message]);
                break;
        }
    };

    const handlePreview = async () => {
        setLoading(true);
        setResult(null);
        setVisualizationConfig(null);
        setProgress(["Starting preview analysis..."]);

        try {
            const taskId = Math.random().toString(36).substring(7);
            const response = await fetch("/api/extension/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    taskId,
                    extensionId: "preview",
                    owner: "aqureshiest",
                    repo: "bookstore",
                    branch: "main",
                    selectedModel: LLM_MODELS.ANTHROPIC_CLAUDE_3_5_HAIKU_NEW.id,
                    params: {},
                    config,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to start analysis");
            }

            await handleStreamResponse(response);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Analysis failed";
            setProgress((prev) => [...prev, `Error: ${errorMessage}`]);
            setVisualizationConfig(null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
            <DialogTrigger asChild>
                <Button size="sm" disabled={disabled}>
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
                <DialogHeader>
                    <DialogTitle>Extension Preview</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <div className="text-sm text-muted-foreground">
                            Testing with sample repository:{" "}
                            <span className="font-semibold">aqureshiest/bookstore</span>
                        </div>
                        {result && (
                            <div className="flex gap-2">
                                <Button
                                    variant={viewMode === "raw" ? "default" : "outline"}
                                    onClick={() => setViewMode("raw")}
                                    size="sm"
                                >
                                    Raw Output
                                </Button>
                                <Button
                                    variant={viewMode === "formatted" ? "default" : "outline"}
                                    onClick={() => setViewMode("formatted")}
                                    size="sm"
                                    disabled={!visualizationConfig}
                                >
                                    Formatted View
                                </Button>
                            </div>
                        )}
                        <Button onClick={handlePreview} disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Running...
                                </>
                            ) : (
                                <>
                                    <Play className="mr-2 h-4 w-4" />
                                    Run Preview
                                </>
                            )}
                        </Button>
                    </div>

                    <ProgressFeed progress={progress} slim={true} />

                    {result && (
                        <div className="space-y-4 overflow-auto max-h-[500px]">
                            {viewMode === "formatted" && visualizationConfig ? (
                                <VisualizationRenderer data={result} config={visualizationConfig} />
                            ) : (
                                <Card className="p-4">
                                    <JsonViewer data={result} />
                                </Card>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default PreviewExtension;
