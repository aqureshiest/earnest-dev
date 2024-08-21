"use client";

import { LLM_MODELS } from "@/modules/utilities/llmInfo";
import { useSearchParams } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import Ably from "ably";
import SpecificationsCard from "../components/SpecificationsCard";
import ImplementationPlanCard from "../components/ImplementationPlanCard";

const PullRequest: React.FC = () => {
    const params = useSearchParams();

    const [repo, setRepo] = useState<string | null>(null);
    const [branch, setBranch] = useState<string | null>(null);

    const [description, setDescription] = useState("");

    const messagesContainerRef = useRef<HTMLDivElement>(null);

    const [progress, setProgress] = useState<string[]>([
        "Fill in the task description and click 'Create Pull Request' to start the process.",
        "You can monitor the progress of the pull request creation below.",
    ]);
    const [currentFile, setCurrentFile] = useState<string>("");

    const [isCreating, setIsCreating] = useState(false);
    const [generatedPRLink, setGeneratedPRLink] = useState<string | null>(null);
    const [selectedModel, setSelectedModel] = useState(LLM_MODELS.ANTHROPIC_CLAUDE_3_5_SONNET);
    const [useAllFiles, setUseAllFiles] = useState(false);

    const owner = process.env.NEXT_PUBLIC_GITHUB_OWNER!;

    const [specifications, setSpecifications] =
        useState<AIAssistantResponse<Specifications> | null>(null);
    const [implementationPlan, setImplementationPlan] =
        useState<AIAssistantResponse<ImplementationPlan> | null>(null);

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

    const handleDescriptionChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setDescription(event.target.value);
    };

    const handleCreatePullRequest = async () => {
        setIsCreating(true);
        setGeneratedPRLink(null);
        setProgress([]);
        setCurrentFile("");
        setSpecifications(null);
        setImplementationPlan(null);

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
                    updatesChannel: channelName,
                }),
            });

            // handle 500 response
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error);
            }

            // handle successful response
            setGeneratedPRLink((await response.json()).prLink);
        } catch (error: any) {
            console.error("Error creating pull request:", error);
            setProgress((prev) => [...prev, "Error creating pull request. Please try again."]);
            setProgress((prev) => [...prev, error.message]);
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
                            case "Indexing completed.":
                                setCurrentFile("");
                                break;
                        }
                    }
                    // overall progress
                    else {
                        setProgress((prev) => [...prev, data]);
                    }
                    break;
                case "specifications":
                    setSpecifications(data);
                    break;
                case "implementationplan":
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

    // Scroll to the bottom of the messages div whenever progress updates
    const scrollToBottom = () => {
        if (messagesContainerRef && messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [progress, generatedPRLink]);

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-6">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

                            {/* Create Pull Request Button */}
                            <div className="flex justify-end">
                                <button
                                    onClick={handleCreatePullRequest}
                                    className="bg-teal-700 text-white px-4 py-2 rounded-md hover:bg-teal-600 transition disabled:bg-gray-300"
                                    disabled={isCreating}
                                >
                                    {isCreating ? "Creating..." : "Create Pull Request"}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right column: Progress Monitor */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Progress Monitor */}
                        <div className="bg-white rounded-lg shadow p-4">
                            <h2 className="font-semibold text-gray-800 text-center border-b border-gray-200 mb-2 pb-2">
                                Overall Progress
                            </h2>
                            <div
                                ref={messagesContainerRef}
                                className="space-y-1 overflow-y-auto max-h-60"
                            >
                                {progress.map((message, index) => (
                                    <p key={index} className="text-sm text-gray-700">
                                        {message.startsWith("*") ? (
                                            <span className="ml-4">&#8226; {message.slice(1)}</span>
                                        ) : (
                                            message
                                        )}
                                    </p>
                                ))}
                            </div>
                            {/* Display current file processing */}
                            {currentFile && (
                                <div className="text-sm text-gray-700 flex items-center">
                                    <span className="animate-blink mr-2">|</span>
                                    {currentFile}
                                </div>
                            )}
                        </div>

                        {/* large button to view pull request */}
                        {generatedPRLink && (
                            <div className="text-center">
                                <a
                                    href={generatedPRLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="bg-teal-700 text-white px-4 py-2 rounded-md hover:bg-teal-600 transition disabled:bg-gray-300"
                                >
                                    View Pull Request
                                </a>
                            </div>
                        )}

                        {/* Specifications Assistant Progress */}
                        <SpecificationsCard specifications={specifications} />

                        {/* Implementation Plan Assistant Progress */}
                        <ImplementationPlanCard implementationPlan={implementationPlan} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PullRequest;
