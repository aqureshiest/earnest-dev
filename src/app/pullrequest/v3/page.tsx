"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
    ChevronRight,
    Code,
    GitPullRequest,
    Send,
    Settings,
    X,
    FileCode,
    Bot,
    User,
    Info,
    CheckCircle,
    AlertCircle,
} from "lucide-react";

import RepoAndBranchSelection from "../../components/RepoAndBranchSelection";
import AIModelSelection from "../../components/AIModelSelection";
import CodeViewer from "../../components/CodeViewer";
import ProgressFeed from "../../components/ProgressFeed";
import { LLM_MODELS } from "@/modules/utils/llmInfo";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const PullRequestV3: React.FC = () => {
    const [taskId, setTaskId] = useState("");
    const [repo, setRepo] = useState<string>("");
    const [branch, setBranch] = useState<string>("");
    const [message, setMessage] = useState("");
    const [selectedModel, setSelectedModel] = useState<string>("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    // Chat and file generation state
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [generatedFiles, setGeneratedFiles] = useState<Record<string, FileChange>>({});
    const [currentStep, setCurrentStep] = useState<string | null>(null);
    const [excludedFiles, setExcludedFiles] = useState<Set<string>>(new Set());
    const [progress, setProgress] = useState<string[]>([]);
    const [isFullWidth, setIsFullWidth] = useState(false);
    const [selectedFile, setSelectedFile] = useState<FileChange | null>(null);

    const owner = process.env.NEXT_PUBLIC_GITHUB_OWNER!;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || !repo || !branch || !selectedModel || isProcessing) return;

        // Reset state
        setIsProcessing(true);
        setChatMessages((prev) => [...prev, { role: "user", content: message }]);
        setProgress([]);
        setGeneratedFiles({});
        setCurrentStep(null);
        setExcludedFiles(new Set());

        // Add initial AI message
        setChatMessages((prev) => [
            ...prev,
            {
                role: "assistant",
                content:
                    "I'll help generate code for this task. Let me analyze and create an implementation plan...",
                status: "thinking",
            },
        ]);

        const newTaskId = Date.now().toString();
        setTaskId(newTaskId);

        try {
            // Call the API to generate code
            const response = await fetch(`/api/generate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    taskId: newTaskId,
                    owner,
                    repo,
                    branch,
                    description: message.trim(),
                    selectedModel,
                    useV2: true, // Flag to use new CodingAssistantV2
                }),
            });

            await handleStreamResponse(response);
        } catch (error: any) {
            handleError(error.message);
        } finally {
            setIsProcessing(false);
            setMessage("");
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
                handleError(data.message);
                break;
            case "step":
                handleStepUpdate(data);
                break;
            case "file":
                handleFileUpdate(data);
                break;
            case "complete":
                handleComplete(data);
                break;
        }
    };

    const handleProgress = (data: any) => {
        setProgress((prev) => [...prev, data.message]);

        // Also add important progress updates to chat
        if (data.message.includes("✅") || data.message.includes("⚠️")) {
            setChatMessages((prev) => {
                // Update the last message if it's a thinking message from the assistant
                const lastMessage = prev[prev.length - 1];
                if (lastMessage.role === "assistant" && lastMessage.status === "thinking") {
                    return [
                        ...prev.slice(0, -1),
                        { ...lastMessage, content: data.message, status: "completed" },
                    ];
                }
                return [...prev, { role: "assistant", content: data.message, status: "update" }];
            });
        }
    };

    const handleStepUpdate = (data: any) => {
        // This would handle step updates when a new step from the implementation plan starts
        setCurrentStep(data.message.title);

        setChatMessages((prev) => [
            ...prev,
            {
                role: "assistant",
                content: `Starting step: ${data.message.title}`,
                status: "step",
                step: data.message,
            },
        ]);
    };

    const handleFileUpdate = (data: any) => {
        // This would handle individual file updates
        const fileChange = data.message;
        setGeneratedFiles((prev) => ({
            ...prev,
            [fileChange.path]: fileChange,
        }));

        // Add message about file completion
        setChatMessages((prev) => [
            ...prev,
            {
                role: "assistant",
                content: `Generated ${fileChange.operation} for ${fileChange.path}`,
                status: "file",
                file: fileChange,
            },
        ]);
    };

    const handleComplete = (data: any) => {
        setChatMessages((prev) => [
            ...prev,
            {
                role: "assistant",
                content:
                    "I've completed the implementation. You can review the files above and create a pull request when ready.",
                status: "completed",
            },
        ]);
    };

    const handleError = (message: string) => {
        console.error(message);
        setProgress((prev) => [...prev, message]);

        setChatMessages((prev) => [
            ...prev,
            {
                role: "assistant",
                content: `Error: ${message}`,
                status: "error",
            },
        ]);

        setIsProcessing(false);
    };

    const toggleSettings = () => setShowSettings(!showSettings);

    const handleCreatePullRequest = async () => {
        if (Object.keys(generatedFiles).length === 0) return;

        // Prepare the code changes object
        const codeChanges: CodeChanges = {
            title: "Implementation of requested features",
            newFiles: [],
            modifiedFiles: [],
            deletedFiles: [],
        };

        // Organize files based on their operation
        Object.values(generatedFiles).forEach((file) => {
            if (excludedFiles.has(file.path)) return;

            if (file.operation === "new") {
                codeChanges.newFiles.push({
                    path: file.path,
                    thoughts: file.thoughts || "",
                    content: file.content || "",
                });
            } else if (file.operation === "modify") {
                codeChanges.modifiedFiles.push({
                    path: file.path,
                    thoughts: file.thoughts || "",
                    content: file.content || "",
                });
            } else if (file.operation === "delete") {
                codeChanges.deletedFiles.push({
                    path: file.path,
                });
            }
        });

        setIsProcessing(true);

        try {
            const response = await fetch(`/api/pr`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    taskId,
                    owner,
                    repo,
                    branch,
                    description: chatMessages.find((m) => m.role === "user")?.content || "",
                    selectedModel,
                    prTitle:
                        "Implemented: " +
                        chatMessages.find((m) => m.role === "user")?.content.slice(0, 50) +
                        "...",
                    params: {
                        generatedCode: {
                            response: codeChanges,
                        },
                    },
                }),
            });

            await handleStreamResponse(response);
        } catch (error: any) {
            handleError(error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleFullWidth = () => setIsFullWidth(!isFullWidth);

    const formatStepContent = (step: any) => {
        if (!step) return null;

        return (
            <div className="text-sm">
                <p className="font-medium">{step.title}</p>
                <p className="text-muted-foreground mt-1">{step.thoughts}</p>
                <div className="mt-2">
                    <p className="font-medium">Files:</p>
                    <ul className="ml-4 list-disc">
                        {step.files.map((file: any, i: number) => (
                            <li key={i}>
                                <span className="font-mono">{file.path}</span>
                                <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-muted">
                                    {file.operation}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        );
    };

    const renderChatMessage = (message: ChatMessage, index: number) => {
        const isUser = message.role === "user";

        return (
            <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex mb-4 ${isUser ? "justify-end" : "justify-start"}`}
            >
                <div className={`flex max-w-[80%] ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                    <div
                        className={`rounded-full w-8 h-8 flex items-center justify-center 
                        ${
                            isUser
                                ? "bg-primary text-primary-foreground ml-2"
                                : "bg-accent text-accent-foreground mr-2"
                        }`}
                    >
                        {isUser ? <User size={16} /> : <Bot size={16} />}
                    </div>

                    <div
                        className={`p-3 rounded-lg ${
                            isUser
                                ? "bg-primary text-primary-foreground"
                                : message.status === "error"
                                ? "bg-destructive text-destructive-foreground"
                                : message.status === "step"
                                ? "bg-accent text-accent-foreground"
                                : "bg-secondary text-secondary-foreground"
                        }`}
                    >
                        {message.status === "thinking" && (
                            <div className="flex items-center">
                                <span className="mr-2">{message.content}</span>
                                <span className="animate-pulse">...</span>
                            </div>
                        )}

                        {message.status === "step" && (
                            <Collapsible>
                                <div className="flex items-center">
                                    <CollapsibleTrigger className="flex items-center justify-between w-full">
                                        <span>{message.content}</span>
                                        <ChevronRight size={16} className="ml-2" />
                                    </CollapsibleTrigger>
                                </div>
                                <CollapsibleContent className="mt-2 border-t pt-2">
                                    {formatStepContent(message.step)}
                                </CollapsibleContent>
                            </Collapsible>
                        )}

                        {message.status === "file" && (
                            <div className="flex items-center">
                                <FileCode size={16} className="mr-2" />
                                <span>{message.content}</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="ml-2"
                                    onClick={() => setSelectedFile(message.file!)}
                                >
                                    View
                                </Button>
                            </div>
                        )}

                        {(message.status === undefined ||
                            message.status === "completed" ||
                            message.status === "update" ||
                            message.status === "error") && <span>{message.content}</span>}
                    </div>
                </div>
            </motion.div>
        );
    };

    return (
        <div className="h-screen flex flex-col">
            {/* Header with controls */}
            <div className="border-b p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-semibold">AI Code Generator V2</h1>

                    <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" onClick={toggleSettings}>
                            <Settings size={16} className="mr-2" />
                            Settings
                        </Button>

                        <Button variant="outline" size="sm" onClick={toggleFullWidth}>
                            {isFullWidth ? (
                                <>
                                    <FileCode size={16} className="mr-2" />
                                    Show Files
                                </>
                            ) : (
                                <>
                                    <Info size={16} className="mr-2" />
                                    Full Width
                                </>
                            )}
                        </Button>

                        {Object.keys(generatedFiles).length > 0 && (
                            <Button
                                variant="default"
                                size="sm"
                                onClick={handleCreatePullRequest}
                                disabled={isProcessing}
                            >
                                <GitPullRequest size={16} className="mr-2" />
                                Create PR
                            </Button>
                        )}
                    </div>
                </div>

                {/* Collapsible settings */}
                <AnimatePresence>
                    {showSettings && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="mt-4 overflow-hidden"
                        >
                            <Card>
                                <CardContent className="p-4">
                                    <div className="grid grid-cols-3 gap-4">
                                        {/* Repository Selection */}
                                        <div>
                                            <RepoAndBranchSelection
                                                repo={repo}
                                                setRepo={setRepo}
                                                branch={branch}
                                                setBranch={setBranch}
                                                loading={isProcessing}
                                            />
                                        </div>

                                        {/* AI Model Selection */}
                                        <div>
                                            <AIModelSelection
                                                selectedModel={selectedModel}
                                                setSelectedModel={setSelectedModel}
                                                loading={isProcessing}
                                                recommendedModel={
                                                    LLM_MODELS.ANTHROPIC_CLAUDE_3_7_SONNET
                                                }
                                            />
                                        </div>

                                        {/* Additional settings */}
                                        <div>
                                            <h3 className="text-sm font-medium mb-2">Options</h3>
                                            <div className="space-y-2">
                                                <div className="flex items-center space-x-2">
                                                    <Switch id="auto-view-files" />
                                                    <Label htmlFor="auto-view-files">
                                                        Auto-view files
                                                    </Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Switch id="show-progress" defaultChecked />
                                                    <Label htmlFor="show-progress">
                                                        Show progress updates
                                                    </Label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Main content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Chat panel - always visible */}
                <div className={`flex flex-col border-r ${isFullWidth ? "w-full" : "w-1/2"}`}>
                    {/* Chat messages */}
                    <ScrollArea className="flex-1 p-4">
                        <div className="space-y-4">
                            {chatMessages.map(renderChatMessage)}
                            {chatMessages.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                                    <Bot size={48} className="text-muted-foreground mb-4" />
                                    <h3 className="text-xl font-medium mb-2">AI Code Generator</h3>
                                    <p className="text-muted-foreground mb-4">
                                        Describe what code you want to generate, and I'll implement
                                        it step by step.
                                    </p>
                                    <ul className="text-sm text-muted-foreground text-left">
                                        <li className="mb-1">
                                            • Select repository and branch in settings
                                        </li>
                                        <li className="mb-1">• Provide a clear task description</li>
                                        <li className="mb-1">
                                            • Watch as files are generated incrementally
                                        </li>
                                        <li>• Review and create a pull request when ready</li>
                                    </ul>
                                </div>
                            )}

                            {/* Progress feed (slim) */}
                            {progress.length > 0 && !isFullWidth && (
                                <div className="mt-4">
                                    <ProgressFeed progress={progress} slim={true} />
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    {/* Message input */}
                    <div className="border-t p-4">
                        <form onSubmit={handleSubmit} className="flex items-end space-x-2">
                            <div className="flex-1">
                                <Textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Describe what you want to build..."
                                    className="resize-none"
                                    rows={3}
                                    disabled={isProcessing}
                                />
                            </div>
                            <Button
                                type="submit"
                                disabled={
                                    isProcessing ||
                                    !message.trim() ||
                                    !repo ||
                                    !branch ||
                                    !selectedModel
                                }
                                className="h-10"
                            >
                                {isProcessing ? "Processing..." : <Send size={16} />}
                            </Button>
                        </form>
                    </div>
                </div>

                {/* File panel - conditionally visible */}
                {!isFullWidth && (
                    <div className="w-1/2 flex flex-col">
                        <Tabs defaultValue="files" className="flex-1 flex flex-col">
                            <div className="border-b px-4">
                                <TabsList>
                                    <TabsTrigger value="files">Generated Files</TabsTrigger>
                                    <TabsTrigger value="explorer">File Explorer</TabsTrigger>
                                </TabsList>
                            </div>

                            <TabsContent value="files" className="flex-1 p-0">
                                {Object.keys(generatedFiles).length > 0 ? (
                                    <CodeViewer
                                        codeChanges={{
                                            title: "Generated Files",
                                            newFiles: Object.values(generatedFiles)
                                                .filter((f) => f.operation === "new")
                                                .map((f) => ({
                                                    path: f.path,
                                                    thoughts: f.thoughts || "",
                                                    content: f.content || "",
                                                })),
                                            modifiedFiles: Object.values(generatedFiles)
                                                .filter((f) => f.operation === "modify")
                                                .map((f) => ({
                                                    path: f.path,
                                                    thoughts: f.thoughts || "",
                                                    content: f.content || "",
                                                })),
                                            deletedFiles: Object.values(generatedFiles)
                                                .filter((f) => f.operation === "delete")
                                                .map((f) => ({ path: f.path })),
                                        }}
                                        owner={owner}
                                        repo={repo}
                                        branch={branch}
                                        showDiff={true}
                                        excludedFiles={excludedFiles}
                                        setExcludedFiles={setExcludedFiles}
                                    />
                                ) : (
                                    <div className="h-full flex items-center justify-center text-center p-8">
                                        <div>
                                            <FileCode
                                                size={48}
                                                className="text-muted-foreground mb-4 mx-auto"
                                            />
                                            <h3 className="text-xl font-medium mb-2">
                                                No Files Generated Yet
                                            </h3>
                                            <p className="text-muted-foreground">
                                                Files will appear here as they are generated.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="explorer" className="flex-1 p-4">
                                {/* File explorer implementation */}
                                <div className="h-full flex items-center justify-center text-center">
                                    <div>
                                        <p className="text-muted-foreground">
                                            Repository file explorer will be implemented here.
                                        </p>
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                )}
            </div>

            {/* File viewer modal */}
            <AnimatePresence>
                {selectedFile && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                    >
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            className="bg-card text-card-foreground rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden"
                        >
                            <div className="flex items-center justify-between p-4 border-b">
                                <div className="flex items-center">
                                    <FileCode size={18} className="mr-2" />
                                    <span className="font-medium">{selectedFile.path}</span>
                                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-muted">
                                        {selectedFile.operation}
                                    </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => toggleExcludeFile(selectedFile.path)}
                                    >
                                        {excludedFiles.has(selectedFile.path) ? (
                                            <>
                                                <CheckCircle size={16} className="mr-2" />
                                                Include in PR
                                            </>
                                        ) : (
                                            <>
                                                <X size={16} className="mr-2" />
                                                Exclude from PR
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setSelectedFile(null)}
                                    >
                                        <X size={16} />
                                    </Button>
                                </div>
                            </div>
                            <div className="p-4 max-h-[calc(90vh-8rem)] overflow-auto">
                                {selectedFile.thoughts && (
                                    <div className="mb-4 p-3 bg-muted rounded-md">
                                        <h4 className="font-medium mb-1">Implementation Notes</h4>
                                        <p className="text-sm">{selectedFile.thoughts}</p>
                                    </div>
                                )}
                                <div className="font-mono text-sm whitespace-pre-wrap overflow-x-auto">
                                    {selectedFile.content}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Define TypeScript types
interface ChatMessage {
    role: "user" | "assistant";
    content: string;
    status?: "thinking" | "completed" | "error" | "update" | "step" | "file";
    step?: any;
    file?: FileChange;
}

interface FileChange {
    path: string;
    operation: "new" | "modify" | "delete";
    content?: string;
    thoughts?: string;
    oldContents?: string;
}

function toggleExcludeFile(filePath: string) {
    // Placeholder function - will be replaced by actual state setter
}

export default PullRequestV3;
