"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Loader2,
    Trash2,
    CheckCircle2,
    Copy,
    Settings2,
    MessageSquare,
    ChevronDown,
    ChevronRight,
    Upload,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import AIModelSelection from "../components/AIModelSelection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MarkdownViewer from "../components/MarkdownViewer";
import { LLM_MODELS } from "@/modules/utils/llmInfo";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import IntegrationQuestionsModal from "../components/IntegrationTestsQuestionsModal";
import EnhancedProgressFeed, { EnhancedProgressMessage } from "../components/EnhancedProgressFeed";
import {
    IntegrationQuestion,
    IntegrationQuestions,
} from "@/modules/ai/integration-tests/IntegrationMapQuestionsAssistant";
import { TestSpecificationGenerator } from "@/modules/ai/integration-tests/TestSpecificationGenerator";

interface FileInput {
    id: string;
    file: File;
    type: "prd" | "integration-map" | "figma";
    description?: string;
}

const IntegrationTestGenerator: React.FC = () => {
    const [taskId, setTaskId] = useState("");
    const [projectName, setProjectName] = useState("");
    const [projectDescription, setProjectDescription] = useState("");
    const [uploadedFiles, setUploadedFiles] = useState<FileInput[]>([]);
    const [prdContent, setPrdContent] = useState("");
    const [selectedModel, setSelectedModel] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);

    const [progressMessages, setProgressMessages] = useState<EnhancedProgressMessage[]>([]);
    const [generatedContent, setGeneratedContent] = useState<string>("");
    const [integrationMapAnalysis, setIntegrationMapAnalysis] = useState<string>("");
    const [figmaScreensAnalysis, setFigmaScreensAnalysis] = useState<string>("");
    const [activeTab, setActiveTab] = useState<string>("progress");

    const [finalOutputPrompt, setFinalOutputPrompt] = useState<string>(
        TestSpecificationGenerator.PROMPT_OUTPUT
    );

    const [showQuestionsModal, setShowQuestionsModal] = useState(false);
    const [integrationQuestions, setIntegrationQuestions] = useState<IntegrationQuestions>({
        title: "Integration Questions",
        questions: [],
    });

    const [copied, setCopied] = useState(false);

    const addProgressMessage = (
        message: string,
        type: string = "info",
        isMarkdown: boolean = false
    ) => {
        setProgressMessages((prev) => [
            ...prev,
            {
                message,
                content: message,
                type,
                isMarkdown,
            },
        ]);
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(generatedContent);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    const handleFileUpload = (
        files: FileList | null,
        type: "prd" | "integration-map" | "figma"
    ) => {
        if (!files?.length) return;

        const newFiles = Array.from(files).map((file) => ({
            id: new Date().getTime().toString() + Math.random().toString(36).substring(2, 9),
            file,
            type,
            description: file.name,
        }));

        setUploadedFiles((prev) => [...prev, ...newFiles]);

        // If it's a PRD file, try to read its content
        if (type === "prd" && files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (e.target?.result) {
                    setPrdContent(e.target.result as string);
                }
            };
            reader.readAsText(files[0]);
        }
    };

    const removeFile = (id: string) => {
        setUploadedFiles(uploadedFiles.filter((f) => f.id !== id));
    };

    const restart = () => {
        // reset everything
        setGeneratedContent("");
        setIntegrationMapAnalysis("");
        setFigmaScreensAnalysis("");
        setIntegrationQuestions({
            title: "Integration Questions",
            questions: [],
        });
        setProgressMessages([]);
        setActiveTab("progress");
    };

    // Generate questions after processing integration map
    const handleStartProcess = async () => {
        restart();

        setIsGeneratingQuestions(true);
        try {
            const newTaskId = new Date().getTime().toString();
            setTaskId(newTaskId);

            addProgressMessage("Starting integration map processing...");
            setActiveTab("progress");

            const formData = new FormData();
            const input = {
                projectName,
                projectDescription,
            };

            formData.append("taskId", newTaskId);
            formData.append("input", JSON.stringify(input));
            formData.append("prdContent", prdContent);
            formData.append("model", selectedModel);

            // upload integration map file
            const integrationMapFile = uploadedFiles.find(
                (file) => file.type === "integration-map"
            );
            if (integrationMapFile) {
                formData.append("file_integration-map", integrationMapFile.file);
            }

            const response = await fetch("/api/int-tests/int-map", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Failed to process integration map: ${response.statusText}`);
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            while (reader) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split("\n");

                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        const event = JSON.parse(line.slice(6));

                        if (event.type === "integration_map_analysis") {
                            setIntegrationMapAnalysis(event.message.analysis);
                            addProgressMessage("Integration map analysis completed", "info");
                        } else if (event.type === "complete") {
                            setIntegrationQuestions(event.message.questions);
                            setShowQuestionsModal(true);
                        } else if (event.message) {
                            addProgressMessage(
                                event.message,
                                event.type === "error" ? "error" : "info"
                            );
                        }
                    }
                }
            }
        } catch (error: any) {
            console.error("Error processing integration map:", error);
            addProgressMessage(`Error: ${error.message}`, "error");
        } finally {
            setIsGeneratingQuestions(false);
        }
    };

    // Handle responses and generate test specification
    const handleQuestionsComplete = async (responses: IntegrationQuestion[]) => {
        setShowQuestionsModal(false);
        await generateTestSpecification(responses);
    };

    // Generate integration test specification
    const generateTestSpecification = async (questions: IntegrationQuestion[]) => {
        setIsGenerating(true);
        addProgressMessage("Starting test specification generation...");
        setGeneratedContent("");
        setActiveTab("progress");

        try {
            const formData = new FormData();

            // Add basic data
            const input = {
                projectName,
                projectDescription,
            };

            formData.append("taskId", taskId);
            formData.append("input", JSON.stringify(input));
            formData.append("prdContent", prdContent);
            formData.append("integrationMapAnalysis", integrationMapAnalysis);
            formData.append("model", selectedModel);

            // Add questions and answers
            formData.append("questions", JSON.stringify(questions));

            // upload figma screen files if any
            const figmaScreenFiles = uploadedFiles.filter((file) => file.type === "figma");
            if (figmaScreenFiles.length > 0) {
                figmaScreenFiles.forEach((file) => {
                    formData.append(`file_figma_${file.id}`, file.file);
                });
            }

            // final output prompt
            formData.append("finalOutputPrompt", finalOutputPrompt || "");

            const response = await fetch("/api/int-tests/generate", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Failed to generate test specification: ${response.statusText}`);
            }

            // Handle streaming response
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            while (reader) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split("\n");

                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        const event = JSON.parse(line.slice(6));

                        switch (event.type) {
                            case "complete":
                                setGeneratedContent(event.message.content);
                                setActiveTab("final");
                                break;

                            case "figma_screens_analysis":
                                setFigmaScreensAnalysis(event.message.analysis);
                                addProgressMessage("Figma screens analysis completed", "info");
                                break;

                            case "final":
                                addProgressMessage(event.message, "success");
                                setIsGenerating(false);
                                break;

                            default:
                                event.message &&
                                    addProgressMessage(
                                        event.message,
                                        event.type == "error" ? "error" : "info"
                                    );
                                break;
                        }
                    }
                }
            }
        } catch (error: any) {
            console.error("Error generating test specification:", error);
            addProgressMessage(`Error: ${error.message}`, "error");
        } finally {
            setIsGenerating(false);
        }
    };

    const [isConfigOpen, setIsConfigOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 py-12 px-6 relative">
            {/* Light mode grid pattern for entire page */}
            <div
                className="absolute inset-0 dark:hidden"
                style={{
                    backgroundSize: "80px 80px",
                    backgroundImage: `
                    linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)
                `,
                    opacity: 0.7,
                }}
            ></div>

            {/* Dark mode grid pattern for entire page */}
            <div className="absolute inset-0 hidden dark:block bg-grid-pattern opacity-3"></div>

            {/* Content container with z-index to appear above the grid */}
            <div className="max-w-6xl mx-auto space-y-12 relative z-10">
                {/* Header */}
                <motion.div
                    className="text-center mb-12"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <CheckCircle2 className="w-12 h-12 text-primary" />
                        <h1 className="text-4xl font-light">
                            Integration Test Specification Generator
                        </h1>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
                        Generate comprehensive integration test specifications for quality engineers
                    </p>
                </motion.div>

                {/* Input Section */}
                <div className="grid grid-cols-[1fr,320px] gap-8">
                    {/* Left Column - Form */}
                    <div className="space-y-8">
                        {/* Project Information */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                        >
                            <h2 className="text-xl font-medium flex items-center gap-2 bg-slate-100 p-4 rounded-md dark:bg-slate-800">
                                Project Information
                            </h2>
                            <Card className="overflow-hidden border-none shadow-lg">
                                <CardContent className="p-6 space-y-4">
                                    <div className="space-y-2">
                                        <Label>Project Name</Label>
                                        <Input
                                            value={projectName}
                                            onChange={(e) => setProjectName(e.target.value)}
                                            placeholder="Enter project name"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Project Description</Label>
                                        <Textarea
                                            value={projectDescription}
                                            onChange={(e) => setProjectDescription(e.target.value)}
                                            placeholder="Describe the project and integration testing objectives..."
                                            className="resize-none"
                                            rows={3}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Document Uploads */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                        >
                            <h2 className="text-xl font-medium flex items-center gap-2 bg-slate-100 p-4 rounded-md dark:bg-slate-800">
                                Document Uploads
                            </h2>
                            <Card className="overflow-hidden border-none shadow-lg">
                                <CardContent className="p-6 space-y-4">
                                    <div className="space-y-2">
                                        <Label>PRD Document</Label>
                                        <div className="flex gap-8">
                                            <Input
                                                type="file"
                                                onChange={(e) =>
                                                    handleFileUpload(e.target.files, "prd")
                                                }
                                                accept=".md" // Assuming PRD is a markdown file
                                            />
                                            <span className="text-sm text-slate-500">
                                                (markdown only)
                                            </span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Integration Map (Required)</Label>
                                        <div className="flex gap-8">
                                            <Input
                                                type="file"
                                                onChange={(e) =>
                                                    handleFileUpload(
                                                        e.target.files,
                                                        "integration-map"
                                                    )
                                                }
                                                accept="image/png, application/pdf"
                                            />
                                            <span className="text-sm text-slate-500">
                                                (png or pdf only)
                                            </span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Figma Screens (Optional)</Label>
                                        <div className="flex gap-8">
                                            <Input
                                                type="file"
                                                multiple
                                                onChange={(e) =>
                                                    handleFileUpload(e.target.files, "figma")
                                                }
                                                accept="image/png, application/pdf"
                                            />
                                            <span className="text-sm text-slate-500">
                                                (png or pdf only)
                                            </span>
                                        </div>
                                    </div>

                                    {uploadedFiles.length > 0 && (
                                        <div className="space-y-2 mt-4">
                                            <Label>Uploaded Files</Label>
                                            <div className="space-y-2">
                                                {uploadedFiles.map((file) => (
                                                    <div
                                                        key={file.id}
                                                        className="flex items-center justify-between p-2 border rounded-md"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-1 bg-primary/10 rounded-full">
                                                                <Upload className="w-3 h-3 text-primary" />
                                                            </div>
                                                            <span className="text-sm">
                                                                {file.file.name}
                                                            </span>
                                                            <span className="text-xs text-slate-500">
                                                                {(file.file.size / 1024).toFixed(1)}{" "}
                                                                KB
                                                            </span>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => removeFile(file.id)}
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>

                    {/* Right Column - Configuration Panel */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.8 }}
                    >
                        <Card>
                            <CardContent className="p-6 space-y-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-2">
                                        <Settings2 className="w-5 h-5 text-primary" />
                                        <h3 className="text-lg font-medium">Configuration</h3>
                                    </div>
                                </div>

                                {/* Model Selection */}
                                <div className="space-y-2">
                                    <AIModelSelection
                                        selectedModel={selectedModel}
                                        setSelectedModel={setSelectedModel}
                                        recommendedModel={LLM_MODELS.ANTHROPIC_CLAUDE_3_7_SONNET}
                                        loading={isGenerating}
                                    />
                                </div>

                                {/* Final prompt output */}
                                <Collapsible open={isConfigOpen} onOpenChange={setIsConfigOpen}>
                                    <CollapsibleTrigger className="flex items-center justify-between w-full">
                                        <Label>Advanced Configuration</Label>
                                        {isConfigOpen ? (
                                            <ChevronDown className="w-4 h-4" />
                                        ) : (
                                            <ChevronRight className="w-4 h-4" />
                                        )}
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="space-y-4 mt-4">
                                        <div className="space-y-2">
                                            <Label>Final Output</Label>
                                            <Textarea
                                                value={finalOutputPrompt}
                                                onChange={(e) =>
                                                    setFinalOutputPrompt(e.target.value)
                                                }
                                                placeholder="Output prompt for the test specification..."
                                                rows={16}
                                            />
                                        </div>
                                    </CollapsibleContent>
                                </Collapsible>

                                {/* Generate Button */}
                                <Button
                                    onClick={handleStartProcess}
                                    disabled={
                                        isGeneratingQuestions ||
                                        isGenerating ||
                                        !selectedModel ||
                                        !projectName ||
                                        !uploadedFiles.some((f) => f.type === "integration-map")
                                    }
                                    className="w-full"
                                >
                                    {isGeneratingQuestions || isGenerating ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <MessageSquare className="mr-2 h-4 w-4" />
                                            Generate Tests
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>

                {/* Output Section */}
                <AnimatePresence>
                    {(isGenerating ||
                        isGeneratingQuestions ||
                        generatedContent ||
                        integrationMapAnalysis ||
                        progressMessages.length > 0) && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="border-t border-slate-200 dark:border-slate-800 pt-8"
                        >
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                <TabsList className="w-full bg-slate-100 dark:bg-slate-800/50 mb-6">
                                    <TabsTrigger
                                        value="progress"
                                        className="flex-1 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800"
                                    >
                                        Generation Progress
                                    </TabsTrigger>
                                    {integrationMapAnalysis && (
                                        <TabsTrigger
                                            value="analysis"
                                            className="flex-1 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800"
                                        >
                                            Documents Analysis
                                        </TabsTrigger>
                                    )}
                                    {generatedContent && (
                                        <TabsTrigger
                                            value="final"
                                            className="flex-1 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800"
                                        >
                                            Test Specification
                                        </TabsTrigger>
                                    )}
                                </TabsList>

                                {/* Progress Tab */}
                                <TabsContent value="progress" className="mt-0">
                                    {(isGenerating || isGeneratingQuestions) && (
                                        <div className="flex items-center gap-3 mb-4 text-primary">
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            <h3 className="font-medium">
                                                Generating Integratio Test Specifications...
                                            </h3>
                                        </div>
                                    )}
                                    <EnhancedProgressFeed messages={progressMessages} title="" />
                                </TabsContent>

                                {/* Architecture Analysis Tab */}
                                {integrationMapAnalysis && (
                                    <TabsContent value="analysis">
                                        <div className="prose dark:prose-invert max-w-none mb-8">
                                            <div className="p-4 bg-white dark:bg-slate-900 rounded-lg">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <h4 className="text-lg font-medium">
                                                        Integration Map Analysis
                                                    </h4>
                                                </div>
                                                <div className="prose dark:prose-invert max-w-none">
                                                    <MarkdownViewer
                                                        content={integrationMapAnalysis}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        {figmaScreensAnalysis && (
                                            <div className="prose dark:prose-invert max-w-none mb-8">
                                                <div className="p-4 bg-white dark:bg-slate-900 rounded-lg">
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <h4 className="text-lg font-medium">
                                                            UI Screens Analysis
                                                        </h4>
                                                    </div>
                                                    <div className="prose dark:prose-invert max-w-none">
                                                        <MarkdownViewer
                                                            content={figmaScreensAnalysis}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </TabsContent>
                                )}

                                {/* Final Test Specification Tab */}
                                {generatedContent && (
                                    <TabsContent value="final">
                                        <div className="flex items-center justify-end mb-4">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleCopy}
                                                className="gap-2"
                                            >
                                                {copied ? (
                                                    <>
                                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                        Copied!
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="h-4 w-4" />
                                                        Copy Markdown
                                                    </>
                                                )}
                                            </Button>
                                        </div>

                                        <div className="prose dark:prose-invert max-w-none">
                                            <div className="py-4 px-6 bg-white dark:bg-slate-900 rounded-lg">
                                                <MarkdownViewer content={generatedContent} />
                                            </div>
                                        </div>
                                    </TabsContent>
                                )}
                            </Tabs>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Integration Questions Modal */}
                <IntegrationQuestionsModal
                    isOpen={showQuestionsModal}
                    onClose={() => setShowQuestionsModal(false)}
                    questions={integrationQuestions}
                    onComplete={handleQuestionsComplete}
                    isLoading={isGenerating}
                />
            </div>
        </div>
    );
};

export default IntegrationTestGenerator;
