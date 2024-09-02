"use client";

import { LLM_MODELS } from "@/modules/utilities/llmInfo";
import { useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import SpecificationsCard from "../components/SpecificationsCard";
import ImplementationPlanCard from "../components/ImplementationPlanCard";
import AssistantWorkspace from "../components/AssistantWorkspace";
import ProgressFeed from "../components/ProgressFeed";
import { AnimatePresence, motion } from "framer-motion";
import CodeViewer from "../components/CodeViewer";
import { AssistantState, AssistantStates, useAssistantStates } from "./useAssistantStates";

const PullRequest: React.FC = () => {
    const params = useSearchParams();

    const [taskId, setTaskId] = useState("");

    const [repo, setRepo] = useState<string | null>(null);
    const [branch, setBranch] = useState<string | null>(null);
    const [description, setDescription] = useState("");

    const [progress, setProgress] = useState<string[]>([]);
    const [currentFile, setCurrentFile] = useState<string>();
    const [isCreating, setIsCreating] = useState(false);
    const [acceptedChanges, setAcceptedChanges] = useState(false);
    const [showDiff, setShowDiff] = useState(false);

    const [selectedModel, setSelectedModel] = useState(LLM_MODELS.ANTHROPIC_CLAUDE_3_5_SONNET);

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

    const availableModels = [
        LLM_MODELS.OPENAI_GPT_4O,
        LLM_MODELS.OPENAI_GPT_4O_MINI,
        LLM_MODELS.ANTHROPIC_CLAUDE_3_5_SONNET,
        LLM_MODELS.ANTHROPIC_CLAUDE_3_HAIKU,
    ];

    const { assistantStates, resetAssistantStates, updateAssistantState } = useAssistantStates();

    const owner = process.env.NEXT_PUBLIC_GITHUB_OWNER!;

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
            }),
        });

        if (!response.ok) throw new Error("Failed to start task");
        return response;
    };

    useEffect(() => {
        setRepo(params.get("repo"));
        setBranch(params.get("branch"));
    }, [params]);

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
            handleError(error, "Error creating pull request:");
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
            handleError(error, "Error creating pull request:");
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
            case "error":
                handleProgressOrError(data);
                break;
            case "start":
                updateAssistantState(data.message.assistant, AssistantState.Working);
                break;
            case "complete":
                handleComplete(data, data.message.assistant);
                break;
            case "final":
                handleFinal(data);
                break;
        }
    };

    const handleProgressOrError = (data: any) => {
        if (data.message.startsWith("file:")) {
            setCurrentFile(data.message.slice(5));
        } else {
            setProgress((prev) => [...prev, data.message]);
        }
    };

    const handleComplete = (data: any, assistant: keyof AssistantStates) => {
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
        updateAssistantState(assistant, AssistantState.Completed);
    };

    const handleFinal = (data: any) => {
        if (data.message.prLink) {
            setGeneratedPRLink(data.message.prLink);
        } else {
            setProgress((prev) => [...prev, data.message]);
        }
    };

    const handleError = (error: Error, message: string) => {
        console.error(message, error);
        setProgress((prev) => [...prev, `${message} Please try again.`, error.message]);
        resetAssistantStates();
    };

    const resetState = () => {
        setProgress([]);
        setCurrentFile("");
        setGeneratedPRLink(null);
        setAcceptedChanges(false);
        setSpecifications(null);
        setImplementationPlan(null);
        setGeneratedCodeResponse(null);
        setGeneratedCode(null);
        setExcludedFiles(new Set());
        resetAssistantStates();
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

    const toggleDarkMode = () => {
        const html = document.querySelector('html');
        if (html) {
            const currentTheme = html.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            html.setAttribute('data-theme', newTheme);
        }
    };

    return (
        <div className="min-h-screen bg-[rgb(var(--background-rgb))] py-8 px-6">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Code Viewer Modal */}
                    <AnimatePresence>
                        {isCodeViewerOpen && generatedCode && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 ${
                                    isFullPageCode ? "z-50" : "z-40"
                                }`}
                            >
                                <motion.div
                                    initial={{ scale: 0.9 }}
                                    animate={{ scale: 1 }}
                                    exit={{ scale: 0.9 }}
                                    className={`bg-[rgb(var(--background-rgb))] rounded-lg shadow-xl ${
                                        isFullPageCode
                                            ? "fixed inset-0 m-0"
                                            : "max-w-6xl w-full max-h-[90vh]"
                                    }`}
                                >
                                    <div className="p-4 border-b flex justify-between items-center">
                                        <h2 className="text-xl font-semibold">Code Changes</h2>
                                        <label className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={showDiff}
                                                onChange={() => setShowDiff((prev) => !prev)}
                                                className="form-checkbox h-5 w-5 text-teal-600"
                                            />
                                            <span className="text-[rgb(var(--foreground-rgb))]">Show Diff</span>
                                        </label>

                                        <div>
                                            {!acceptedChanges && (
                                                <button
                                                    onClick={handleAcceptChanges}
                                                    disabled={generatedPRLink != null}
                                                    className="mr-6 bg-teal-700 text-white px-4 py-2 rounded-md hover:bg-teal-600 transition"
                                                >
                                                    Accept Changes
                                                </button>
                                            )}
                                            <button
                                                onClick={toggleFullPageCode}
                                                className="mr-2 text-[rgb(var(--foreground-rgb))] hover:bg-gray-200 bg-gray-100 p-2 rounded-lg"
                                            >
                                                {isFullPageCode
                                                    ? "Exit Full Screen"
                                                    : "Full Screen"}
                                            </button>
                                            <button
                                                onClick={toggleCodeViewer}
                                                className="text-[rgb(var(--foreground-rgb))] hover:bg-gray-200 p-2 rounded-lg bg-gray-100"
                                            >
                                                Close
                                            </button>
                                        </div>
                                    </div>
                                    <div
                                        className={`${
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
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Left column: Form */}
                    <div className="bg-[rgb(var(--background-rgb))] rounded-lg shadow p-6">
                        <h2 className="text-xl font-semibold text-[rgb(var(--foreground-rgb))] mb-6">
                            Create New Pull Request
                        </h2>
                        <div className="space-y-4">
                            {/* Selected Repository and Branch */}
                            <div>
                                <label className="block text-sm font-medium text-[rgb(var(--foreground-rgb))]">
                                    Selected Repository
                                </label>
                                <input
                                    value={repo ?? ""}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2 bg-[rgb(var(--background-rgb))] text-[rgb(var(--foreground-rgb))]"
                                    disabled
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[rgb(var(--foreground-rgb))]">
                                    Selected Branch
                                </label>
                                <input
                                    value={branch ?? ""}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2 bg-[rgb(var(--background-rgb))] text-[rgb(var(--foreground-rgb))]"
                                    disabled
                                />
                            </div>

                            {/* Task Description */}
                            <div>
                                <label className="block text-sm font-medium text-[rgb(var(--foreground-rgb))]">
                                    Task Description
                                </label>
                                <textarea
                                    className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-[rgb(var(--background-rgb))] text-[rgb(var(--foreground-rgb))]"
                                    rows={8}
                                    placeholder="Describe the task..."
                                    value={description}
                                    onChange={handleDescriptionChange}
                                    disabled={isCreating}
                                />
                            </div>

                            {/* AI Model Selection */}
                            <div>
                                <label className="block text-sm font-medium text-[rgb(var(--foreground-rgb))]">
                                    AI Model
                                </label>
                                <select
                                    value={selectedModel}
                                    onChange={(e) => setSelectedModel(e.target.value)}
                                    className="mt-1 block w-full border shadow-sm pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-[rgb(var(--background-rgb))] text-[rgb(var(--foreground-rgb))]"
                                    disabled={isCreating}
                                >
                                    {availableModels.map((model) => (
                                        <option key={model} value={model}>
                                            {model.replace(/_/g, " ")}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Action Buttons */}
                            <div className="mt-6 border-t pt-4">
                                <button
                                    onClick={handleCreatePullRequest}
                                    className="w-full bg-teal-700 text-white px-4 py-2 rounded-md hover:bg-teal-600 transition disabled:bg-gray-300"
                                    disabled={isCreating}
                                >
                                    {isCreating ? "Processing..." : "Create Pull Request"}
                                </button>

                                {generatedCode && !acceptedChanges && (
                                    <div className="mt-6 border-t pt-4">
                                        {/* add a spacer */}
                                        <span className="text-[rgb(var(--foreground-rgb))] text-sm">
                                            The code has been generated successfully
                                        </span>
                                        <button
                                            onClick={toggleCodeViewer}
                                            className="mt-2 w-full bg-teal-700 text-white px-4 py-2 rounded-md hover:bg-teal-600 transition"
                                        >
                                            Review Generated Code
                                        </button>
                                    </div>
                                )}

                                {generatedPRLink && (
                                    <div className="mt-6 border-t pt-4">
                                        {/* add a spacer */}
                                        <span className="text-[rgb(var(--foreground-rgb))] text-sm">
                                            The PR has been created successfully
                                        </span>
                                        <a
                                            href={generatedPRLink}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="mt-2 w-full bg-teal-700 text-white px-4 py-2 rounded-md hover:bg-teal-600 transition text-center block"
                                        >
                                            View Pull Request
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right column: Assistant Progress and Output */}
                    <div className="space-y-6">
                        <AssistantWorkspace assistantStates={assistantStates} />

                        <ProgressFeed progress={progress} currentFile={currentFile} />

                        <SpecificationsCard specifications={specifications} />

                        <ImplementationPlanCard implementationPlan={implementationPlan} />
                    </div>
                </div>
            </div>
            {/* Dark Mode Toggle Button */}
            <button
                onClick={toggleDarkMode}
                className="fixed bottom-4 right-4 bg-teal-700 text-white px-4 py-2 rounded-md hover:bg-teal-600 transition"
            >
                Toggle Dark Mode
            </button>
        </div>
    );
};

export default PullRequest;