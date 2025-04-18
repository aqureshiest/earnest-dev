"use client";

import React, { useState } from "react";
import SpecificationsCard from "../components/SpecificationsCard";
import ImplementationPlanCard from "../components/ImplementationPlanCard";
import { AnimatePresence, motion } from "framer-motion";
import CodeViewer from "../components/CodeViewer";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

import { Check, Code, GitPullRequestArrow, Maximize, Minimize, SearchCheck, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import RepoAndBranchSelection from "../components/RepoAndBranchSelection";
import AIModelSelection from "../components/AIModelSelection";
import { LLM_MODELS } from "@/modules/utils/llmInfo";
import EnhancedProgressFeed, { EnhancedProgressMessage } from "../components/EnhancedProgressFeed";

const PullRequest: React.FC = () => {
    const [taskId, setTaskId] = useState("");

    const [repo, setRepo] = useState<string>("");
    const [branch, setBranch] = useState<string>("");
    const [description, setDescription] = useState("");

    const [progressMessages, setProgressMessages] = useState<EnhancedProgressMessage[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [acceptedChanges, setAcceptedChanges] = useState(false);
    const [showDiff, setShowDiff] = useState(false);

    const [selectedModel, setSelectedModel] = useState<string>("");

    const [generatedPRLink, setGeneratedPRLink] = useState<string | null>(null);

    const [isCodeViewerOpen, setIsCodeViewerOpen] = useState(false);
    const [isFullPageCode, setIsFullPageCode] = useState(false);

    const [excludedFiles, setExcludedFiles] = useState<Set<string>>(new Set());

    const [specifications, setSpecifications] =
        useState<AIAssistantResponse<Specifications> | null>(null);
    const [implementationPlan, setImplementationPlan] =
        useState<AIAssistantResponse<ImplementationPlan> | null>(null);
    const [generatedCodeResponse, setGeneratedCodeResponse] =
        useState<AIAssistantResponse<CodeChanges> | null>(null);
    const [generatedCode, setGeneratedCode] = useState<CodeChanges | null>(null);

    const [skipSpecifications, setSkipSpecifications] = useState(true);

    const owner = process.env.NEXT_PUBLIC_GITHUB_OWNER!;

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
        const response = await fetch(`/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                taskId,
                owner,
                repo,
                branch,
                description: description.trim(),
                selectedModel,
                params: {
                    skipSpecifications,
                },
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
            case "warning":
                handleWarnings(data);
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

    const handleWarnings = (data: any) => {
        addProgressMessage(data.message, "warning");
    };

    const handleComplete = (data: any, assistant: string) => {
        const { response } = data.message;
        switch (assistant) {
            case "specifications":
                setSpecifications(response);
                break;
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
        setSpecifications(null);
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

    return (
        <div className="min-h-screen py-8 px-6">
            <div className="max-w-7xl mx-auto">
                <motion.h1
                    className="text-3xl font-semibold text-center mb-8 text-gray-800 dark:text-gray-100"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    Pull Request Generator
                </motion.h1>
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
                                        loading={isCreating}
                                    />

                                    {/* AI Model Selection */}
                                    <AIModelSelection
                                        selectedModel={selectedModel}
                                        setSelectedModel={setSelectedModel}
                                        loading={isCreating}
                                        recommendedModel={LLM_MODELS.ANTHROPIC_CLAUDE_3_7_SONNET}
                                    />

                                    {/* Skip Specifications Checkbox */}
                                    <div className="flex items-center space-x-2 justify-end">
                                        <Switch
                                            id="skip-specifications"
                                            checked={skipSpecifications}
                                            onCheckedChange={() =>
                                                setSkipSpecifications((prev) => !prev)
                                            }
                                            disabled={isCreating}
                                        />
                                        <Label htmlFor="accept-changes">Skip Specifications</Label>
                                    </div>

                                    {/* Task Description */}
                                    <div>
                                        <Label htmlFor="description">Task Description</Label>
                                        <Textarea
                                            className="mt-1"
                                            rows={8}
                                            placeholder="Describe the task..."
                                            value={description}
                                            onChange={handleDescriptionChange}
                                            disabled={isCreating}
                                        />
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="space-y-4">
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
                            <EnhancedProgressFeed messages={progressMessages} maxHeight="500px" />

                            <SpecificationsCard specifications={specifications} />

                            <ImplementationPlanCard implementationPlan={implementationPlan} />
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default PullRequest;
