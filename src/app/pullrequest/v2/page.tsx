"use client";

import React, { useState, useEffect } from "react";
import EnhancedImplementationPlanCard, {
    StepStatus,
} from "../../components/EnhancedImplementationPlanCard";
import { AnimatePresence, motion } from "framer-motion";
import CodeViewer from "../../components/CodeViewer";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

import {
    Check,
    Code,
    Download,
    GitPullRequestArrow,
    Maximize,
    Minimize,
    SearchCheck,
    Sparkles,
    Wand2,
    X,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import RepoAndBranchSelection from "../../components/RepoAndBranchSelection";
import AIModelSelection from "../../components/AIModelSelection";
import { LLM_MODELS } from "@/modules/utils/llmInfo";
import EnhancedProgressFeed, {
    EnhancedProgressMessage,
} from "@/app/components/EnhancedProgressFeed";
import ImproveTaskModal from "../../components/ImproveTaskModal";

interface StepStatusMap {
    [stepTitle: string]: StepStatus;
}

const PullRequestV2: React.FC = () => {
    const [taskId, setTaskId] = useState("");

    const [repo, setRepo] = useState<string>("");
    const [branch, setBranch] = useState<string>("");
    const [description, setDescription] = useState("");
    const [isImproveModalOpen, setIsImproveModalOpen] = useState(false);
    const [maximizeTokenUsage, setMaximizeTokenUsage] = useState(false);

    const [progressMessages, setProgressMessages] = useState<EnhancedProgressMessage[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [acceptedChanges, setAcceptedChanges] = useState(false);
    const [showDiff, setShowDiff] = useState(false);

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

    const [stepStatus, setStepStatus] = useState<StepStatusMap>({});
    const [activeStep, setActiveStep] = useState<string | null>(null);
    const [currentOpenStep, setCurrentOpenStep] = useState<string | null>(null);

    const [inputTokens, setInputTokens] = useState<number>(0);
    const [outputTokens, setOutputTokens] = useState<number>(0);
    const [cost, setCost] = useState<number>(0);

    const owner = process.env.NEXT_PUBLIC_GITHUB_OWNER!;

    // Hook to auto-expand the active step when it changes
    useEffect(() => {
        if (activeStep) {
            setCurrentOpenStep(activeStep);
        }
    }, [activeStep]);

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
        selectedModel: string
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
                maximizeTokenUsage,
            }),
        });

        if (!response.ok) throw new Error("Failed to start task");
        return response;
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

    const handleCreatePullRequest = async () => {
        setIsCreating(true);
        resetState();

        try {
            const newTaskId = Date.now().toString();
            setTaskId(newTaskId);

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
        } finally {
            setIsCreating(false);
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
                break;
            case "step_status":
                handleStepStatus(data);
                break;
            case "file":
                handleFileUpdate(data);
                break;
            case "error":
                handleError(new Error(data.message));
                break;
            case "complete":
                handleComplete(data, data.message.assistant);
                break;
            case "final":
                handleFinal(data);
                break;
        }
    };

    const handleProgress = (data: any) => {
        addProgressMessage(data.message);
    };

    const handleStepStatus = (data: any) => {
        const { title, status, stepIndex, totalSteps, summary, error } = data.message;

        // Update step status map
        setStepStatus((prevStatus) => ({
            ...prevStatus,
            [title]: status === "started" ? "active" : status,
        }));

        // Set active step or clear it if completed/error
        if (status === "started") {
            setActiveStep(title);
        } else if (activeStep === title) {
            setActiveStep(null);
        }

        // Add appropriate message to progress feed
        if (status === "started") {
            addProgressMessage(`Starting step: ${title} (${stepIndex + 1}/${totalSteps})`);
        } else if (status === "completed") {
            addProgressMessage(`Completed step: ${title}`);

            // If summary is provided, add it to progress feed as markdown
            if (summary) {
                addProgressMessage(summary, "success", true);
            }
        } else if (status === "error") {
            addProgressMessage(`Error in step: ${title} - ${error}`, "error");
        }
    };

    const handleFileUpdate = (data: any) => {
        // const { path, operation } = data.message;
        // addProgressMessage(`File: ${path} - ${operation}`);
    };

    const handleComplete = (data: any, assistant: string) => {
        const { response } = data.message;
        switch (assistant) {
            case "planning":
                setImplementationPlan(response);

                // Initialize step status for all steps as pending
                if (response.response && response.response.steps) {
                    const initialStepStatus: StepStatusMap = {};
                    response.response.steps.forEach((step: Step) => {
                        initialStepStatus[step.title] = "pending";
                    });
                    setStepStatus(initialStepStatus);
                }

                break;
            case "code":
                setGeneratedCodeResponse(response);
                setGeneratedCode(response.response);

                // Mark all remaining steps as completed
                if (implementationPlan?.response?.steps) {
                    const finalStepStatus: StepStatusMap = {};
                    implementationPlan.response.steps.forEach((step: Step) => {
                        finalStepStatus[step.title] = "completed";
                    });
                    setActiveStep(null);
                }
                break;
        }

        // add tokens and cost for both assistants
        if (assistant == "planning" || assistant == "code") {
            setInputTokens((prev) => prev + response.inputTokens);
            setOutputTokens((prev) => prev + response.outputTokens);
            setCost((prev) => prev + response.cost);
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

        // If we have an active step, mark it as error
        if (activeStep) {
            setStepStatus((prevStatus) => ({
                ...prevStatus,
                [activeStep]: "error",
            }));
        }
    };

    const resetState = () => {
        setProgressMessages([]);
        setGeneratedPRLink(null);
        setAcceptedChanges(false);
        setImplementationPlan(null);
        setGeneratedCodeResponse(null);
        setGeneratedCode(null);
        setExcludedFiles(new Set());
        setStepStatus({});
        setActiveStep(null);
        setCurrentOpenStep(null);
        // reset tokens and cost
        setInputTokens(0);
        setOutputTokens(0);
        setCost(0);
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

    const [downloadingPatch, setDownloadingPatch] = useState(false);

    const handleDownloadPatch = async () => {
        if (!generatedCode) return;

        try {
            setDownloadingPatch(true);
            // Show loading indicator
            addProgressMessage("Generating patch file...");

            const response = await fetch(`/api/patch`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    owner,
                    repo,
                    branch,
                    title: generatedCode.title || description.substring(0, 50),
                    codeChanges: {
                        ...generatedCode,
                        newFiles: generatedCode.newFiles?.filter(
                            (file) => !excludedFiles.has(file.path)
                        ),
                        modifiedFiles: generatedCode.modifiedFiles?.filter(
                            (file) => !excludedFiles.has(file.path)
                        ),
                        deletedFiles: generatedCode.deletedFiles?.filter(
                            (file) => !excludedFiles.has(file.path)
                        ),
                    },
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to generate patch");
            }

            // Get the filename from the Content-Disposition header if available
            const contentDisposition = response.headers.get("Content-Disposition");
            let filename = "changes.patch";
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1];
                }
            }

            // Convert response to blob and create download link
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.style.display = "none";
            a.href = url;
            a.download = filename;

            // Trigger download
            document.body.appendChild(a);
            a.click();

            // Cleanup
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            addProgressMessage("Patch file downloaded successfully", "success");
        } catch (error: any) {
            console.error("Error downloading patch:", error);
            addProgressMessage(`Failed to download patch: ${error.message}`, "error");
        } finally {
            setDownloadingPatch(false);
        }
    };

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
                        <Sparkles className="w-6 h-6 text-primary" />
                        <h1 className="text-3xl font-light">Earnest AI Code Generator</h1>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
                        Generate code and create pull requests with AI assistance.
                    </p>
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
                                                    <div className="flex items-center space-x-2">
                                                        <Button
                                                            onClick={handleAcceptChanges}
                                                            disabled={generatedPRLink != null}
                                                            className="mr-2"
                                                        >
                                                            <Check className="mr-2 h-4 w-4" />
                                                            Accept Changes & Create PR
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            onClick={handleDownloadPatch}
                                                            disabled={
                                                                generatedPRLink != null ||
                                                                downloadingPatch
                                                            }
                                                        >
                                                            <Download className="mr-2 h-4 w-4" />
                                                            Download Patch
                                                        </Button>
                                                    </div>
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
                                        loading={isCreating}
                                    />

                                    {/* AI Model Selection */}
                                    <AIModelSelection
                                        selectedModel={selectedModel}
                                        setSelectedModel={setSelectedModel}
                                        loading={isCreating}
                                        recommendedModel={LLM_MODELS.AWS_BEDROCK_CLAUDE_37_SONNET}
                                    />

                                    {/* Task Description */}
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="description">Task Description</Label>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setIsImproveModalOpen(true)}
                                                disabled={isCreating || !description.trim()}
                                            >
                                                <Wand2 className="h-4 w-4 mr-2" />
                                                Improve with AI
                                            </Button>
                                        </div>
                                        <Textarea
                                            className="mt-1"
                                            rows={8}
                                            placeholder="Describe the task..."
                                            value={description}
                                            onChange={handleDescriptionChange}
                                            disabled={isCreating}
                                        />
                                    </div>

                                    {/* maximizeTokenUsage radio button */}
                                    <div className="flex items-center">
                                        <Label htmlFor="maximizeTokenUsage">
                                            Maximize Token Usage
                                        </Label>
                                        <Switch
                                            id="maximizeTokenUsage"
                                            className="ml-2"
                                            checked={maximizeTokenUsage}
                                            disabled={isCreating}
                                            onCheckedChange={() =>
                                                setMaximizeTokenUsage((prev) => !prev)
                                            }
                                        />
                                        <p className="text-sm text-slate-500 ml-2">
                                            enable for complex tasks
                                        </p>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="space-y-4 pt-4">
                                        <Button
                                            onClick={handleCreatePullRequest}
                                            className="w-full"
                                            disabled={
                                                isCreating || !repo || !branch || !description
                                            }
                                        >
                                            <Code className="mr-2 h-4 w-4" />
                                            {isCreating ? "Processing..." : "Generate Code"}
                                        </Button>

                                        {generatedCode && !acceptedChanges && (
                                            <div className="mt-6 border-t pt-4">
                                                {/* add a spacer */}
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
                                                {/* add a spacer */}
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
                            <EnhancedImplementationPlanCard
                                implementationPlan={implementationPlan}
                                stepStatus={stepStatus}
                                activeStep={activeStep}
                                defaultOpenStep={currentOpenStep}
                                inputTokens={inputTokens}
                                outputTokens={outputTokens}
                                cost={cost}
                            />
                            <EnhancedProgressFeed messages={progressMessages} maxHeight="500px" />
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Task Improvement Modal */}
            <ImproveTaskModal
                isOpen={isImproveModalOpen}
                onOpenChange={setIsImproveModalOpen}
                originalDescription={description}
                onApply={setDescription}
            />
        </div>
    );
};

export default PullRequestV2;
