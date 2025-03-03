"use client";

import React, { useState, useEffect, useCallback } from "react";
import ImplementationPlanCard from "../../components/ImplementationPlanCard";
import { AnimatePresence, motion } from "framer-motion";
import CodeViewer from "../../components/CodeViewer";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
    Check,
    Code,
    GitPullRequestArrow,
    Maximize,
    Minimize,
    SearchCheck,
    Sparkles,
    X,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import RepoAndBranchSelection from "../../components/RepoAndBranchSelection";
import AIModelSelection from "../../components/AIModelSelection";
import { LLM_MODELS } from "@/modules/utils/llmInfo";
import EnhancedProgressFeed, {
    EnhancedProgressMessage,
} from "@/app/components/EnhancedProgressFeed";
import { v4 as uuidv4 } from "uuid";

const TASK_STATUS = {
    IDLE: "idle", // Client-side only, not in backend
    PENDING: "pending",
    IN_PROGRESS: "in_progress",
    COMPLETED: "completed",
    ERROR: "error",
};

const PullRequestV2: React.FC = () => {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Get task ID from URL if it exists
    const urlTaskId = searchParams.get("taskId");

    const [taskId, setTaskId] = useState<string>(urlTaskId || "");
    const [taskStatus, setTaskStatus] = useState<string>(TASK_STATUS.IDLE);
    const [repo, setRepo] = useState<string>("");
    const [branch, setBranch] = useState<string>("");
    const [description, setDescription] = useState("");

    const [progressMessages, setProgressMessages] = useState<EnhancedProgressMessage[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [isNewTask, setIsNewTask] = useState(false);
    const [acceptedChanges, setAcceptedChanges] = useState(false);
    const [showDiff, setShowDiff] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);

    const [selectedModel, setSelectedModel] = useState<string>("");

    const [generatedPRLink, setGeneratedPRLink] = useState<string | null>(null);

    const [isCodeViewerOpen, setIsCodeViewerOpen] = useState(false);
    const [isFullPageCode, setIsFullPageCode] = useState(false);

    const [excludedFiles, setExcludedFiles] = useState<Set<string>>(new Set());

    const [implementationPlan, setImplementationPlan] =
        useState<AIAssistantResponse<ImplementationPlan> | null>(null);
    const [generatedCodeResponse, setGeneratedCodeResponse] =
        useState<AIAssistantResponse<CodeChanges> | null>(null);
    const [generatedCode, setGeneratedCode] = useState<CodeChanges | null>(null);

    const owner = process.env.NEXT_PUBLIC_GITHUB_OWNER!;

    // Check if there's an active task when the component mounts or URL changes
    useEffect(() => {
        if (urlTaskId && !isNewTask) {
            checkTaskStatus(urlTaskId);
        }
    }, [urlTaskId, isNewTask]);

    // Check task status
    const checkTaskStatus = async (taskId: string) => {
        try {
            const response = await fetch(`/api/generate/v2?taskId=${taskId}`);

            if (response.ok) {
                const data = await response.json();

                setTaskId(taskId);

                // If the task data includes description/repo/branch, restore it
                if (data.description) setDescription(data.description);
                if (data.repo) setRepo(data.repo);
                if (data.branch) setBranch(data.branch);
                if (data.model) setSelectedModel(data.model);

                // Update task status
                // Map backend status to our frontend status
                if (data.status === "pending") {
                    setTaskStatus(TASK_STATUS.PENDING);
                    addProgressMessage(`Resuming task ${taskId}...`, "info");
                    resumeTask(taskId);
                } else if (data.status === "in_progress") {
                    setTaskStatus(TASK_STATUS.IN_PROGRESS);
                    addProgressMessage(`Resuming task ${taskId}...`, "info");
                    resumeTask(taskId);
                } else if (data.status === "completed") {
                    setTaskStatus(TASK_STATUS.COMPLETED);

                    if (data.completedAt) {
                        const completionDate = new Date(data.completedAt);
                        addProgressMessage(
                            `Task completed on ${completionDate.toLocaleString()}`,
                            "info"
                        );
                    }

                    resumeTask(taskId);
                } else if (data.status === "error") {
                    setTaskStatus(TASK_STATUS.ERROR);
                    addProgressMessage(`Task encountered an error`, "error");
                    resumeTask(taskId);
                }
            }
        } catch (error) {
            console.error("Error checking task status:", error);
            setTaskStatus(TASK_STATUS.ERROR);
        }
    };

    // Create a pull request
    const createPullRequest = async (
        taskId: string,
        owner: string,
        repo: string,
        branch: string,
        description: string,
        selectedModel: string,
        generatedCode: CodeChanges,
        implementationPlan: AIAssistantResponse<ImplementationPlan>,
        excludedFiles: Set<string>
    ) => {
        const response = await fetch(`/api/pr`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                taskId,
                owner,
                repo,
                branch,
                description: description.trim(),
                selectedModel,
                prTitle: generatedCode?.title,
                params: {
                    implementationPlan,
                    generatedCode: {
                        ...generatedCodeResponse,
                        response: {
                            ...generatedCodeResponse?.response,
                            newFiles: generatedCode?.newFiles?.filter(
                                (file) => !excludedFiles.has(file.path)
                            ),
                            modifiedFiles: generatedCode?.modifiedFiles?.filter(
                                (file) => !excludedFiles.has(file.path)
                            ),
                            deletedFiles: generatedCode?.deletedFiles?.filter(
                                (file) => !excludedFiles.has(file.path)
                            ),
                        },
                    },
                },
            }),
        });

        if (!response.ok) throw new Error("Failed to start task");
        return response;
    };

    // Generate code
    const generateCode = async (
        taskId: string,
        owner: string,
        repo: string,
        branch: string,
        description: string,
        selectedModel: string,
        resume: boolean = false
    ) => {
        const response = await fetch(`/api/generate/v2`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                taskId,
                owner,
                repo,
                branch,
                description: description.trim(),
                selectedModel,
                resume,
            }),
        });

        if (!response.ok) throw new Error("Failed to start task");
        return response;
    };

    // Resume a task
    const resumeTask = async (taskId: string) => {
        try {
            setIsCreating(true);

            // Use current form values when resuming a task
            const response = await generateCode(
                taskId,
                owner,
                repo,
                branch,
                description,
                selectedModel,
                true // resume
            );
            await handleStreamResponse(response);
        } catch (error: any) {
            handleError(error.message);
        } finally {
            setIsCreating(false);
        }
    };

    const handleAcceptChanges = async () => {
        if (acceptedChanges) return;

        toggleCodeViewer();
        setIsCreating(true);
        setAcceptedChanges(true);

        try {
            const response = await createPullRequest(
                taskId,
                owner,
                repo!,
                branch!,
                description,
                selectedModel,
                generatedCode!,
                implementationPlan!,
                excludedFiles
            );
            await handleStreamResponse(response);
        } catch (error: any) {
            handleError(error.message);
        } finally {
            setIsCreating(false);
        }
    };

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

    const handleCreatePullRequest = useCallback(async () => {
        // Check if there's already a task that would be overridden
        if (taskId) {
            setShowConfirmDialog(true);
            return;
        }

        proceedWithTaskCreation();
    }, [taskId, repo, branch, description, selectedModel]);

    const resetSession = () => {
        // Clear the task ID from URL and start fresh
        router.push(window.location.pathname);

        // Reset all state
        resetState();
        setTaskId("");
        setTaskStatus(TASK_STATUS.IDLE);
        setIsCreating(false);
        setShowConfirmDialog(false);
    };

    const proceedWithTaskCreation = async () => {
        setIsNewTask(true);
        setIsCreating(true);
        resetState();
        setShowConfirmDialog(false);
        setTaskStatus(TASK_STATUS.PENDING); // Start with PENDING, backend will update to IN_PROGRESS

        try {
            // Generate a new UUID for the task
            const newTaskId = uuidv4();
            setTaskId(newTaskId);

            // Update URL with the new task ID
            const params = new URLSearchParams();
            params.set("taskId", newTaskId);
            router.push(`?${params.toString()}`);

            addProgressMessage(`Task ${newTaskId} started`);

            const response = await generateCode(
                newTaskId,
                owner,
                repo!,
                branch!,
                description,
                selectedModel
            );
            await handleStreamResponse(response);
        } catch (error: any) {
            handleError(error.message);
            setTaskStatus(TASK_STATUS.ERROR);
        } finally {
            setIsCreating(false);
            setIsNewTask(false);
        }
    };

    const handleStreamResponse = async (response: Response) => {
        const reader = response.body?.getReader();
        if (!reader) throw new Error("Failed to get stream reader");

        const decoder = new TextDecoder();
        let buffer = ""; // Keep a buffer for incomplete messages

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            buffer += chunk; // Add new chunk to buffer

            // Split on SSE event boundaries
            const events = buffer.split("\n\n");
            buffer = events.pop() || ""; // Keep the last potentially incomplete event

            for (const event of events) {
                const dataLines = event.split("\n").filter((line) => line.startsWith("data: "));

                for (const line of dataLines) {
                    try {
                        console.log(`Received data: ${line}`);
                        const jsonStr = line.slice(6).trim();
                        const data = JSON.parse(jsonStr);
                        handleResponseData(data);
                    } catch (error) {
                        console.error("Error parsing JSON:", error, "in line:", line);
                    }
                }
            }
        }
    };

    const handleResponseData = (data: any) => {
        switch (data.type) {
            case "progress":
                handleProgress(data);
                // If we get any progress update, make sure we're in IN_PROGRESS state
                if (taskStatus === TASK_STATUS.PENDING) {
                    setTaskStatus(TASK_STATUS.IN_PROGRESS);
                }
                break;
            case "summary":
                handleSummary(data);
                break;
            case "file":
                handleFileUpdate(data);
                break;
            case "error":
                handleError(new Error(data.message));
                setTaskStatus(TASK_STATUS.ERROR);
                break;
            case "complete":
                handleComplete(data, data.message.assistant);
                break;
            case "final":
                handleFinal(data);
                setTaskStatus(TASK_STATUS.COMPLETED);
                break;
        }
    };

    const handleProgress = (data: any) => {
        addProgressMessage(data.message);
    };

    const handleSummary = (data: any) => {
        addProgressMessage(`${data.message.summary}`, "success", true);
    };

    const handleFileUpdate = (data: any) => {
        const { path, operation } = data.message;
        addProgressMessage(`File: ${path} - ${operation}`);
    };

    const handleComplete = (data: any, assistant: string) => {
        const { response } = data.message;
        switch (assistant) {
            case "planning":
                setImplementationPlan(response);
                break;
            case "code":
                setGeneratedCodeResponse(response);
                setGeneratedCode(response.response);
                break;
        }
    };

    const handleFinal = (data: any) => {
        if (data.message.prLink) {
            setGeneratedPRLink(data.message.prLink);
        } else {
            addProgressMessage(data.message);
        }
    };

    const handleError = (error: Error) => {
        addProgressMessage(error.message, "error");
    };

    const resetState = () => {
        setProgressMessages([]);
        setGeneratedPRLink(null);
        setAcceptedChanges(false);
        setImplementationPlan(null);
        setGeneratedCodeResponse(null);
        setGeneratedCode(null);
        setExcludedFiles(new Set());
    };

    const toggleCodeViewer = () => {
        setIsCodeViewerOpen(!isCodeViewerOpen);
        setIsFullPageCode(false);
    };

    const toggleFullPageCode = () => {
        setIsFullPageCode(!isFullPageCode);
    };

    const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setDescription(e.target.value);
    };

    // Determine if form inputs should be disabled
    const areInputsDisabled =
        isCreating || taskStatus === TASK_STATUS.IN_PROGRESS || taskStatus === TASK_STATUS.PENDING;

    // Determine if Generate Code button should be disabled
    const isGenerateButtonDisabled = areInputsDisabled || !repo || !branch || !description;

    return (
        <div className="min-h-screen py-8 px-6">
            <div className="max-w-7xl mx-auto">
                {/* Confirmation Dialog */}
                <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Reset Session</AlertDialogTitle>
                            <AlertDialogDescription>
                                {taskStatus === TASK_STATUS.IN_PROGRESS ||
                                taskStatus === TASK_STATUS.PENDING
                                    ? "There is an active task in progress. Starting a new task will cancel the current task."
                                    : "Are you sure you want to reset the session?"}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={resetSession}>
                                Reset Session
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Header */}
                <motion.div
                    className="text-center mb-12"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <Sparkles className="w-6 h-6 text-primary" />
                        <h1 className="text-3xl font-light">Earnest AI Code Generator</h1>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
                        Generate code and create pull requests with AI assistance.
                    </p>
                    {/* Task ID display removed as requested */}
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Code Viewer Modal */}
                    <AnimatePresence>
                        {isCodeViewerOpen && generatedCode && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className={`fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 ${
                                    isFullPageCode ? "z-50" : "z-40"
                                }`}
                            >
                                <motion.div
                                    initial={{ scale: 0.9 }}
                                    animate={{ scale: 1 }}
                                    exit={{ scale: 0.9 }}
                                    className={`bg-card text-card-foreground rounded-lg shadow-lg ${
                                        isFullPageCode
                                            ? "fixed inset-0 m-0"
                                            : "max-w-6xl w-full max-h-[90vh]"
                                    }`}
                                >
                                    <Card>
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                            <CardTitle>Code Changes</CardTitle>
                                            <div className="flex items-center space-x-2">
                                                <Switch
                                                    id="show-diff"
                                                    checked={showDiff}
                                                    onCheckedChange={() =>
                                                        setShowDiff((prev) => !prev)
                                                    }
                                                />
                                                <Label htmlFor="show-diff">Show Diff</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                {!acceptedChanges && (
                                                    <Button
                                                        onClick={handleAcceptChanges}
                                                        disabled={generatedPRLink != null}
                                                        className="mr-2"
                                                    >
                                                        <Check className="mr-2 h-4 w-4" />
                                                        Accept Changes
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={toggleFullPageCode}
                                                >
                                                    {isFullPageCode ? (
                                                        <Minimize className="h-4 w-4" />
                                                    ) : (
                                                        <Maximize className="h-4 w-4" />
                                                    )}
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={toggleCodeViewer}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </CardHeader>
                                        <CardContent
                                            className={`p-0 ${
                                                isFullPageCode ? "h-[calc(100vh-60px)]" : "h-[70vh]"
                                            }`}
                                        >
                                            <CodeViewer
                                                codeChanges={generatedCode}
                                                owner={owner}
                                                repo={repo}
                                                branch={branch}
                                                showDiff={showDiff}
                                                excludedFiles={excludedFiles}
                                                setExcludedFiles={setExcludedFiles}
                                            />
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Left column: Form */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        <Card>
                            <CardHeader>
                                <CardTitle>Create Pull Request</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {/* Selected Repository and Branch */}
                                    <RepoAndBranchSelection
                                        repo={repo}
                                        setRepo={setRepo}
                                        branch={branch}
                                        setBranch={setBranch}
                                        loading={areInputsDisabled}
                                    />

                                    {/* AI Model Selection */}
                                    <AIModelSelection
                                        selectedModel={selectedModel}
                                        setSelectedModel={setSelectedModel}
                                        loading={areInputsDisabled}
                                        recommendedModel={LLM_MODELS.ANTHROPIC_CLAUDE_3_7_SONNET}
                                    />

                                    {/* Task Description */}
                                    <div>
                                        <Label htmlFor="description">Task Description</Label>
                                        <Textarea
                                            className="mt-1"
                                            rows={8}
                                            placeholder="Describe the task..."
                                            value={description}
                                            onChange={handleDescriptionChange}
                                            disabled={areInputsDisabled}
                                        />
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="space-y-4">
                                        <Button
                                            onClick={handleCreatePullRequest}
                                            className="w-full"
                                            disabled={isGenerateButtonDisabled}
                                        >
                                            <Code className="mr-2 h-4 w-4" />
                                            {isCreating
                                                ? "Processing..."
                                                : taskStatus == TASK_STATUS.COMPLETED ||
                                                  taskStatus == TASK_STATUS.ERROR
                                                ? "Reset Session"
                                                : "Generate Code"}
                                        </Button>

                                        {generatedCode && !acceptedChanges && (
                                            <div className="mt-6 border-t pt-4">
                                                <span className="text-sm">
                                                    The code has been generated successfully
                                                </span>
                                                <Button
                                                    onClick={toggleCodeViewer}
                                                    className="w-full mt-2"
                                                >
                                                    <SearchCheck className="mr-2 h-4 w-4" />
                                                    Review Generated Code
                                                </Button>
                                            </div>
                                        )}

                                        {generatedPRLink && (
                                            <div className="mt-6 border-t pt-4">
                                                <span className="text-sm">
                                                    The PR has been created successfully
                                                </span>
                                                <Button asChild className="w-full mt-2">
                                                    <a
                                                        href={generatedPRLink}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >
                                                        <GitPullRequestArrow className="mr-2 h-4 w-4" />
                                                        View Pull Request
                                                    </a>
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Right column: Assistant Progress and Output */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                    >
                        <div className="space-y-6">
                            <EnhancedProgressFeed messages={progressMessages} maxHeight="500px" />

                            <ImplementationPlanCard implementationPlan={implementationPlan} />
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default PullRequestV2;
