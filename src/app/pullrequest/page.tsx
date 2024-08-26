"use client";

import { LLM_MODELS } from "@/modules/utilities/llmInfo";
import { useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import Ably from "ably";
import SpecificationsCard from "../components/SpecificationsCard";
import ImplementationPlanCard from "../components/ImplementationPlanCard";
import AssistantWorkspace from "../components/AssistantWorkspace";
import ProgressFeed from "../components/ProgressFeed";
import { AnimatePresence, motion } from "framer-motion";
import CodeViewer from "../components/CodeViewer";

const PullRequest: React.FC = () => {
    const params = useSearchParams();

    const owner = process.env.NEXT_PUBLIC_GITHUB_OWNER!;

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

    const [specifications, setSpecifications] =
        useState<AIAssistantResponse<Specifications> | null>(null);
    const [implementationPlan, setImplementationPlan] =
        useState<AIAssistantResponse<ImplementationPlan> | null>(null);
    const [generatedCodeResponse, setGeneratedCodeResponse] =
        useState<AIAssistantResponse<CodeChanges> | null>(null);
    const [generatedCode, setGeneratedCode] = useState<CodeChanges | null>(null);

    const [assistantStates, setAssistantStates] = useState({
        specifications: "idle",
        planning: "idle",
        code: "idle",
        PR: "idle",
    });

    const resetAssistantStates = () => {
        setAssistantStates({
            specifications: "idle",
            planning: "idle",
            code: "idle",
            PR: "idle",
        });
    };

    const availableModels = [
        LLM_MODELS.OPENAI_GPT_4O,
        LLM_MODELS.OPENAI_GPT_4O_MINI,
        LLM_MODELS.ANTHROPIC_CLAUDE_3_5_SONNET,
        LLM_MODELS.ANTHROPIC_CLAUDE_3_HAIKU,
    ];
    const channelName = `earnest-dev-ch-${Date.now()}`;

    useEffect(() => {
        setRepo(params.get("repo"));
        setBranch(params.get("branch"));
    }, [params]);

    const updateAssistantState = (assistant: string, state: string) => {
        setAssistantStates((prev) => ({ ...prev, [assistant]: state }));
    };

    const handleAcceptChanges = async () => {
        toggleCodeViewer();
        setIsCreating(true);
        setAcceptedChanges(true);
        openAblyConnection();
        updateAssistantState("PR", "working");

        try {
            const response = await fetch(`/api/pr`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    owner,
                    repo,
                    branch,
                    description: description.trim(),
                    selectedModel,
                    prTitle: generatedCode?.title,
                    params: {
                        implementationPlan: implementationPlan,
                        generatedCode: generatedCodeResponse,
                    },
                    updatesChannel: channelName,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error);
            }

            setGeneratedPRLink((await response.json()).prLink);
            updateAssistantState("PR", "completed");
        } catch (error: any) {
            console.error("Error creating pull request:", error);
            setProgress((prev) => [...prev, "Error creating pull request. Please try again."]);
            setProgress((prev) => [...prev, error.message]);

            resetAssistantStates();
        } finally {
            setIsCreating(false);
            closeAblyConnection();
        }
    };

    const handleCreatePullRequest = async () => {
        setIsCreating(true);
        setProgress([]);
        setCurrentFile("");
        setGeneratedPRLink(null);
        setAcceptedChanges(false);
        setSpecifications(null);
        setImplementationPlan(null);
        setGeneratedCodeResponse(null);
        setGeneratedCode(null);
        resetAssistantStates();

        openAblyConnection();

        try {
            const response = await fetch(`/api/generate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    owner,
                    repo,
                    branch,
                    description: description.trim(),
                    selectedModel,
                    updatesChannel: channelName,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error);
            }

            const responseJson = await response.json();

            setGeneratedCodeResponse(responseJson);
            setGeneratedCode(responseJson.response);
            updateAssistantState("code", "completed");
        } catch (error: any) {
            console.error("Error creating pull request:", error);
            setProgress((prev) => [...prev, "Error creating pull request. Please try again."]);
            setProgress((prev) => [...prev, error.message]);

            resetAssistantStates();
        } finally {
            setIsCreating(false);
            closeAblyConnection();
        }
    };

    let ably: any = null;
    let channel: any = null;

    const openAblyConnection = () => {
        ably = new Ably.Realtime(process.env.NEXT_PUBLIC_ABLY_API_KEY!);
        channel = ably.channels.get(channelName);

        channel.subscribe((message: any) => {
            const { name, data } = message;
            switch (name) {
                case "overall":
                    // files progress
                    if (data.startsWith("file:")) {
                        setCurrentFile(data.slice(5));
                    }
                    // system commands
                    else if (data.startsWith(">")) {
                        switch (data.slice(1)) {
                            case "IC":
                                setCurrentFile("");
                                break;
                            case "SAS":
                                updateAssistantState("specifications", "working");
                                break;
                            case "IPAS":
                                updateAssistantState("planning", "working");
                                break;
                            case "GC":
                                updateAssistantState("code", "working");
                                break;
                        }
                    }
                    // overall progress
                    else {
                        setProgress((prev) => [...prev, data]);
                    }
                    break;
                case "specifications":
                    updateAssistantState("specifications", "completed");
                    setSpecifications(data);
                    break;
                case "implementationplan":
                    updateAssistantState("planning", "completed");
                    setImplementationPlan(data);
                    break;
            }
        });
    };

    const closeAblyConnection = () => {
        if (channel) {
            channel.unsubscribe();
        }

        if (ably && ably.connection.state === "connected") {
            ably.close();
        }
    };

    const handleDescriptionChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setDescription(event.target.value);
    };

    const toggleCodeViewer = () => {
        setIsCodeViewerOpen(!isCodeViewerOpen);
        setIsFullPageCode(false);
    };

    const toggleFullPageCode = () => {
        setIsFullPageCode(!isFullPageCode);
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-6">
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
                                    className={`bg-white rounded-lg shadow-xl ${
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
                                            <span className="text-gray-800">Show Diff</span>
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
                                                className="mr-2 text-gray-900 hover:bg-gray-200 bg-gray-100 p-2 rounded-lg"
                                            >
                                                {isFullPageCode
                                                    ? "Exit Full Screen"
                                                    : "Full Screen"}
                                            </button>
                                            <button
                                                onClick={toggleCodeViewer}
                                                className="text-gray-900 hover:bg-gray-200 p-2 rounded-lg bg-gray-100"
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
                                        />
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Left column: Form */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-semibold text-gray-800 mb-6">
                            Create New Pull Request
                        </h2>
                        <div className="space-y-4">
                            {/* Selected Repository and Branch */}
                            <div>
                                <label className="block text-sm font-medium text-gray-600">
                                    Selected Repository
                                </label>
                                <input
                                    value={repo ?? ""}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                                    readOnly
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-600">
                                    Selected Branch
                                </label>
                                <input
                                    value={branch ?? ""}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                                    readOnly
                                />
                            </div>

                            {/* Task Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-600">
                                    Task Description
                                </label>
                                <textarea
                                    className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    rows={8}
                                    placeholder="Describe the task..."
                                    value={description}
                                    onChange={handleDescriptionChange}
                                    disabled={isCreating}
                                />
                            </div>

                            {/* AI Model Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-600">
                                    AI Model
                                </label>
                                <select
                                    value={selectedModel}
                                    onChange={(e) => setSelectedModel(e.target.value)}
                                    className="mt-1 block w-full border shadow-sm pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
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
                                        <span className="text-gray-600 text-sm">
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
                                        <span className="text-gray-600 text-sm">
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
        </div>
    );
};

export default PullRequest;
