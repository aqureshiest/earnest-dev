import React, { useEffect, useRef, useState } from "react";
import Ably from "ably";
import { LLM_MODELS } from "@/modules/utilities/llmInfo";

interface PRModalProps {
    isOpen: boolean;
    onRequestClose: () => void;
    owner: string;
    repo: string;
    branch: string;
}

const PRModal: React.FC<PRModalProps> = ({
    isOpen,
    onRequestClose,
    owner,
    repo,
    branch = "main",
}) => {
    const [description, setDescription] = useState("");
    const [progress, setProgress] = useState<string[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [generatedPRLink, setGeneratedPRLink] = useState<string | null>(null);
    const [selectedModel, setSelectedModel] = useState(LLM_MODELS.ANTHROPIC_CLAUDE_3_5_SONNET);
    const [useAllFiles, setUseAllFiles] = useState(true);

    const messagesEndRef: any = useRef(null);

    const availableModels = [
        LLM_MODELS.OPENAI_GPT_4O,
        LLM_MODELS.OPENAI_GPT_4O_MINI,
        LLM_MODELS.ANTHROPIC_CLAUDE_3_5_SONNET,
        LLM_MODELS.ANTHROPIC_CLAUDE_3_HAIKU,
    ];

    useEffect(() => {
        if (isOpen) {
            const ably = new Ably.Realtime(process.env.NEXT_PUBLIC_ABLY_API_KEY!);
            const channel = ably.channels.get("generate-pr-channel");

            channel.subscribe("progress", (message) => {
                setProgress((prev) => [...prev, message.data]);
                const element = document.getElementById("createPRModalDiv");
                if (element) {
                    element.scrollTop = element.scrollHeight;
                }
            });

            return () => {
                channel.unsubscribe();
                ably.close();
            };
        }
    }, [isOpen]);

    const handleDescriptionChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setDescription(event.target.value);
    };

    const handleCreatePullRequest = async () => {
        setIsCreating(true);
        setGeneratedPRLink(null);
        setProgress([]);

        try {
            const response = await fetch(`/api/pr`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    owner,
                    repo,
                    branch,
                    description,
                    selectedModel,
                    useAllFiles,
                }),
            });

            setGeneratedPRLink((await response.json()).prLink);
        } catch (error) {
            console.error("Error creating pull request:", error);
            setProgress((prev) => [...prev, "Error creating pull request. Please try again."]);
        } finally {
            setIsCreating(false);
        }
    };

    const handleModalClose = () => {
        setGeneratedPRLink(null);
        setProgress([]);
        onRequestClose();
    };

    const scrollToBottom = () => {
        if (messagesEndRef && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [progress, generatedPRLink]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
            <div
                className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg"
                id="createPRModalDiv"
            >
                <h2 className="text-2xl font-bold mb-4">Create New Pull Request</h2>
                <textarea
                    className="w-full p-2 border border-gray-300 rounded mb-4"
                    rows={4}
                    placeholder="Enter pull request description..."
                    value={description}
                    onChange={handleDescriptionChange}
                    disabled={isCreating}
                />
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <label
                            htmlFor="selectedModel"
                            className="block mb-2 text-sm font-medium text-gray-700"
                        >
                            AI Model
                        </label>
                        <select
                            id="selectedModel"
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="block w-full p-2 border border-gray-300 rounded"
                            disabled={isCreating}
                        >
                            {availableModels.map((model) => (
                                <option key={model} value={model}>
                                    {model.replace(/_/g, " ")}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="text-center">
                        <label
                            htmlFor="useAllFiles"
                            className="block mb-2 text-sm font-medium text-gray-700"
                        >
                            Use All Files
                        </label>
                        <input
                            type="checkbox"
                            checked={useAllFiles}
                            onChange={() => setUseAllFiles((prev) => !prev)}
                            disabled={isCreating}
                        />
                    </div>
                </div>
                <div className="flex justify-end">
                    <button
                        onClick={handleCreatePullRequest}
                        className="bg-purple-700 text-white px-4 py-2 rounded hover:bg-purple-600 transition disabled:bg-gray-300"
                        disabled={isCreating}
                    >
                        {isCreating ? "Creating..." : "Create Pull Request"}
                    </button>
                    <button
                        onClick={handleModalClose}
                        className="bg-gray-300 text-gray-700 px-4 py-2 rounded ml-2 hover:bg-gray-200 transition"
                        disabled={isCreating}
                    >
                        Close
                    </button>
                </div>
                {progress.length > 0 && (
                    <div className="mt-4 border rounded-sm p-2 gap-y-2 overflow-y-auto max-h-48">
                        {progress.map((message, index) => {
                            if (message.trim().startsWith("*")) {
                                return (
                                    <p key={index} className="text-sm text-gray-600">
                                        <span className="ml-2">&#8226; {message.slice(1)}</span>
                                    </p>
                                );
                            } else {
                                return (
                                    <p key={index} className="text-sm text-gray-600">
                                        {message}
                                    </p>
                                );
                            }
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                )}

                <div className="text-center">
                    {generatedPRLink && (
                        <a
                            href={generatedPRLink}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-4 bg-gray-100 text-gray-600 px-4 py-2 rounded hover:bg-gray-200 transition inline-block"
                        >
                            View Pull Request
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PRModal;
