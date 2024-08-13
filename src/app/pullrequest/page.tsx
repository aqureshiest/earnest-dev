"use client";

import { LLM_MODELS } from "@/modules/utilities/llmInfo";
import { useSearchParams } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import Ably from "ably";

const PullRequest: React.FC = () => {
    const params = useSearchParams();

    const [repo, setRepo] = useState<string | null>(null);
    const [branch, setBranch] = useState<string | null>(null);

    const [description, setDescription] = useState("");
    const [progress, setProgress] = useState<string[]>([
        "Fill in the task description and click 'Create Pull Request' to start the process.",
        "You can monitor the progress of the pull request creation below.",
    ]);

    const [isCreating, setIsCreating] = useState(false);
    const [generatedPRLink, setGeneratedPRLink] = useState<string | null>(null);
    const [selectedModel, setSelectedModel] = useState(LLM_MODELS.ANTHROPIC_CLAUDE_3_5_SONNET);
    const [useAllFiles, setUseAllFiles] = useState(true);

    const owner = process.env.NEXT_PUBLIC_GITHUB_OWNER!;

    const [specifications, setSpecifications] =
        useState<AIAssistantResponse<Specifications> | null>(null);
    const [implementationPlan, setImplementationPlan] =
        useState<AIAssistantResponse<ImplementationPlan> | null>(null);

    const [isEditingSpecs, setIsEditingSpecs] = useState(false);
    const [isEditingPlan, setIsEditingPlan] = useState(false);

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

            setGeneratedPRLink((await response.json()).prLink);
        } catch (error) {
            console.error("Error creating pull request:", error);
            setProgress((prev) => [...prev, "Error creating pull request. Please try again."]);
        } finally {
            setIsCreating(false);
            closeAblyConnection();
        }
    };

    const toggleEditSpecs = () => {
        setIsEditingSpecs((prev) => !prev);
    };

    const toggleEditPlan = () => {
        setIsEditingPlan((prev) => !prev);
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
                    setProgress((prev) => [...prev, data]);
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

                            <div className="flex items-center space-x-2">
                                <label className="text-sm font-medium text-gray-600">
                                    Use All Files
                                </label>
                                <input
                                    type="checkbox"
                                    checked={useAllFiles}
                                    onChange={() => setUseAllFiles((prev) => !prev)}
                                    disabled={isCreating}
                                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                />
                            </div>

                            {/* Create Pull Request Button */}
                            <div className="flex justify-end">
                                <button
                                    onClick={handleCreatePullRequest}
                                    className="bg-teal-700 text-white px-4 py-2 rounded hover:bg-teal-600 transition"
                                    disabled={isCreating}
                                >
                                    {isCreating ? "Creating..." : "Create Pull Request"}
                                </button>
                            </div>

                            {/* View Pull Request Link */}
                            {generatedPRLink && (
                                <div className="text-end mt-6">
                                    <a
                                        href={generatedPRLink}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-block bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition"
                                    >
                                        View Pull Request
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right column: Progress Monitor */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Progress Monitor */}
                        <div className="bg-white rounded-lg shadow p-4">
                            <h2 className="font-semibold text-gray-800 text-center mb-4">
                                Overall Progress
                            </h2>
                            <div className="space-y-1 overflow-y-auto max-h-60">
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
                        </div>

                        {/* Specifications Assistant Progress */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="font-semibold text-gray-800 mb-4">Specifications</h2>

                                {specifications && (
                                    <div className="text-xs text-end">
                                        <div className="text-gray-500">
                                            Cost: ${specifications?.cost.toFixed(6)}
                                        </div>
                                        <div className="text-gray-500">
                                            Input Tokens: {specifications?.inputTokens}
                                        </div>
                                        <div className="text-gray-500">
                                            Output Tokens: {specifications?.outputTokens}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-4  max-h-96 overflow-auto">
                                {specifications?.response.specifications.map((spec, index) => (
                                    <div
                                        key={index}
                                        className={`p-4 border ${
                                            isEditingSpecs ? "border-blue-500" : "border-gray-300"
                                        } rounded-md`}
                                    >
                                        <h3 className="font-medium text-gray-700">{spec.title}</h3>
                                        <p className="text-sm text-gray-600 mt-2">
                                            <strong>Thoughts:</strong> {spec.thoughts}
                                        </p>
                                        <p className="text-sm text-gray-600 mt-2">
                                            <strong>Specification:</strong>
                                            {spec.specification.split("\n").map((line, index) => (
                                                <div key={index}>{line}</div>
                                            ))}
                                        </p>
                                    </div>
                                ))}
                            </div>
                            {/* <div className="flex justify-end space-x-4 mt-4">
                                <button
                                    onClick={toggleEditSpecs}
                                    className={`text-sm ${
                                        isEditingSpecs ? "text-red-500" : "text-blue-500"
                                    }`}
                                >
                                    {isEditingSpecs ? "Cancel Edit" : "Edit"}
                                </button>
                                {!isEditingSpecs && (
                                    <button className="text-sm text-green-500">Proceed</button>
                                )}
                            </div> */}
                        </div>

                        {/* Implementation Plan Assistant Progress */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="font-semibold text-gray-800 mb-4">
                                    Implementation Plan
                                </h2>

                                {implementationPlan && (
                                    <div className="text-xs text-end">
                                        <div className="text-gray-500">
                                            Cost: ${implementationPlan?.cost.toFixed(6)}
                                        </div>
                                        <div className="text-gray-500">
                                            Input Tokens: {implementationPlan?.inputTokens}
                                        </div>
                                        <div className="text-gray-500">
                                            Output Tokens: {implementationPlan?.outputTokens}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-4  max-h-96 overflow-auto">
                                {implementationPlan?.response.implementationPlan.map(
                                    (step, index) => (
                                        <div
                                            key={index}
                                            className={`p-4 border ${
                                                isEditingPlan
                                                    ? "border-blue-500"
                                                    : "border-gray-300"
                                            } rounded-md`}
                                        >
                                            <h3 className="font-medium text-gray-700">
                                                {step.step}
                                            </h3>
                                            <p className="text-sm text-gray-600 mt-2">
                                                <strong>Thoughts:</strong> {step.thoughts}
                                            </p>
                                            {step.files.map((file, fileIndex) => (
                                                <div key={fileIndex} className="mt-2">
                                                    <p className="text-sm text-gray-600">
                                                        <strong>File:</strong> {file.path} (
                                                        {file.status})
                                                    </p>
                                                    <p className="text-sm text-gray-600">
                                                        <strong>Changes:</strong>{" "}
                                                        {file.todos.map((todo, todoIndex) => (
                                                            <div key={todoIndex}>{todo}</div>
                                                        ))}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )
                                )}
                            </div>
                            {/* <div className="flex justify-end space-x-4 mt-4">
                                <button
                                    onClick={toggleEditPlan}
                                    className={`text-sm ${
                                        isEditingPlan ? "text-red-500" : "text-blue-500"
                                    }`}
                                >
                                    {isEditingPlan ? "Cancel Edit" : "Edit"}
                                </button>
                                {!isEditingPlan && (
                                    <button className="text-sm text-green-500">Proceed</button>
                                )}
                            </div> */}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PullRequest;
