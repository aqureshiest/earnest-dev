"use client";

import { LLM_MODELS } from "@/modules/utilities/llmInfo";
import { useSearchParams } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import Ably from "ably";
import SpecificationsCard from "../components/SpecificationsCard";
import ImplementationPlanCard from "../components/ImplementationPlanCard";
import AssistantWorkspace from "../components/AssistantWorkspace";
import ProgressFeed from "../components/ProgressFeed";

const PullRequest: React.FC = () => {
    const params = useSearchParams();

    const [repo, setRepo] = useState<string | null>(null);
    const [branch, setBranch] = useState<string | null>(null);
    const [description, setDescription] = useState("");

    const [progress, setProgress] = useState<string[]>([]);
    const [currentFile, setCurrentFile] = useState<string>();
    const [isCreating, setIsCreating] = useState(false);

    const [selectedModel, setSelectedModel] = useState(LLM_MODELS.ANTHROPIC_CLAUDE_3_5_SONNET);
    const [useAllFiles, setUseAllFiles] = useState(false);
    const [skipFolders, setSkipFolders] = useState<string[]>([]);
    const [skipFiles, setSkipFiles] = useState<string[]>([]);

    const [generatedPRLink, setGeneratedPRLink] = useState<string | null>(null);

    const [specifications, setSpecifications] = useState<AIAssistantResponse<Specifications>>();
    const [implementationPlan, setImplementationPlan] =
        useState<AIAssistantResponse<ImplementationPlan> | null>(null);

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

    const owner = process.env.NEXT_PUBLIC_GITHUB_OWNER!;
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

    const handleCreatePullRequest = async () => {
        setIsCreating(true);
        setGeneratedPRLink(null);
        setProgress([]);
        setCurrentFile("");
        setSpecifications(null);
        setImplementationPlan(null);
        resetAssistantStates();

        openAblyConnection();

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
                    useAllFiles,
                    skipFolders,
                    skipFiles,
                    updatesChannel: channelName,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error);
            }

            setGeneratedPRLink((await response.json()).prLink);

            // update assistants states
            updateAssistantState("specifications", "completed");
            updateAssistantState("planning", "completed");
        } catch (error: any) {
            console.error("Error creating pull request:", error);
            setProgress((prev) => [...prev, "Error creating pull request. Please try again."]);
            setProgress((prev) => [...prev, error.message]);

            // update assistants states
            updateAssistantState("specifications", "idle");
            updateAssistantState("planning", "idle");
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
                            case "WPR":
                                updateAssistantState("PR", "working");
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
                case "generatedcode":
                    updateAssistantState("code", "completed");
                    console.log("Generated code:", data);
                    break;
                case "prdescription":
                    updateAssistantState("PR", "completed");
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

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-6">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                            {/* skip folders */}
                            <div>
                                <label className="block text-sm font-medium text-gray-600">
                                    Skip Folders
                                </label>
                                <input
                                    value={skipFolders.join(", ")}
                                    onChange={(e) => setSkipFolders(e.target.value.split(","))}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                                    disabled={isCreating}
                                />
                            </div>

                            {/* skip files */}
                            <div>
                                <label className="block text-sm font-medium text-gray-600">
                                    Skip Files
                                </label>
                                <input
                                    value={skipFiles.join(", ")}
                                    onChange={(e) => setSkipFiles(e.target.value.split(","))}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                                    disabled={isCreating}
                                />
                            </div>

                            {/* Create Pull Request Button */}
                            <button
                                onClick={handleCreatePullRequest}
                                className="w-full bg-teal-700 text-white px-4 py-2 rounded-md hover:bg-teal-600 transition disabled:bg-gray-300"
                                disabled={isCreating}
                            >
                                {isCreating ? "Creating..." : "Create Pull Request"}
                            </button>

                            {generatedPRLink && (
                                <div className="text-center">
                                    <hr className="my-4" />
                                    <p className="text-sm text-gray-600 mb-4">
                                        Pull request has been created successfully.
                                    </p>
                                    <a
                                        href={generatedPRLink}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="w-full bg-teal-700 text-white px-4 py-2 rounded-md hover:bg-teal-600 transition"
                                    >
                                        View Pull Request
                                    </a>
                                </div>
                            )}
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
