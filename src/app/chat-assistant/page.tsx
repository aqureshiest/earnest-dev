"use client";

import React, { useState, useRef, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Sparkles,
    Send,
    Code,
    RefreshCw,
    Maximize2,
    Minimize2,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { motion } from "framer-motion";
import RepoAndBranchSelection from "../components/RepoAndBranchSelection";
import AIModelSelection from "../components/AIModelSelection";
import { LLM_MODELS } from "@/modules/utils/llmInfo";
import ReactMarkdown from "react-markdown";
import { Skeleton } from "@/components/ui/skeleton";
import { Toast } from "@/components/ui/toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

interface Message {
    id: string;
    content: string;
    role: "user" | "assistant";
    createdAt: Date;
    codeReferences?: {
        path: string;
        snippet: string;
        lineNumbers: string;
    }[];
}

const ChatAssistant: React.FC = () => {
    const [repo, setRepo] = useState<string>("");
    const [branch, setBranch] = useState<string>("");
    const [selectedModel, setSelectedModel] = useState<string>(
        LLM_MODELS.ANTHROPIC_CLAUDE_3_7_SONNET.id
    );
    const [message, setMessage] = useState<string>("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isIndexing, setIsIndexing] = useState<boolean>(false);
    const [isSettingsPanelExpanded, setIsSettingsPanelExpanded] = useState<boolean>(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // When repo and branch are selected, collapse the settings panel after successful indexing
    useEffect(() => {
        if (repo && branch && !isIndexing && messages.length > 1) {
            // Only auto-collapse after indexing is complete and there's been some interaction
            setIsSettingsPanelExpanded(false);
        }
    }, [repo, branch, isIndexing, messages.length]);

    // Initial welcome message
    useEffect(() => {
        if (messages.length === 0) {
            setMessages([
                {
                    id: "welcome",
                    content:
                        "👋 Hi! I'm your Code Assistant. I can help answer questions about your codebase. Select a repository and branch to get started.",
                    role: "assistant",
                    createdAt: new Date(),
                },
            ]);
        }
    }, []);

    const handleSendMessage = async () => {
        if (!message.trim() || !repo || !branch) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            content: message,
            role: "user",
            createdAt: new Date(),
        };

        // Add user message to chat
        setMessages((prev) => [...prev, userMessage]);
        setMessage("");
        setIsLoading(true);

        try {
            const response = await fetch("/api/chat-assistant", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: userMessage.content,
                    repo,
                    branch,
                    model: selectedModel,
                    history: messages.slice(-10), // Send last 10 messages for context
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to get response");
            }

            const data = await response.json();

            // Add assistant response to chat
            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now().toString(),
                    content: data.response,
                    role: "assistant",
                    createdAt: new Date(),
                    codeReferences: data.codeReferences,
                },
            ]);
        } catch (error) {
            console.error("Error:", error);
            // Add error message
            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now().toString(),
                    content:
                        "Sorry, I encountered an error processing your request. Please try again.",
                    role: "assistant",
                    createdAt: new Date(),
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const refreshCodebaseIndex = async () => {
        if (!repo || !branch) return;

        setIsIndexing(true);

        try {
            const response = await fetch("/api/index-codebase", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    repo,
                    branch,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to index codebase");
            }

            const data = await response.json();

            toast({
                title: "Indexing Complete",
                description: "The codebase has been indexed successfully.",
            });

            // Add system message about successful indexing
            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now().toString(),
                    content:
                        "Codebase has been indexed successfully! I'm ready to answer your questions.",
                    role: "assistant",
                    createdAt: new Date(),
                },
            ]);
        } catch (error) {
            console.error("Error indexing codebase:", error);
            toast({
                title: "Indexing Failed",
                description: "There was an error indexing the codebase. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsIndexing(false);
        }
    };

    const renderMessage = (message: Message) => {
        return (
            <div
                key={message.id}
                className={`mb-4 ${
                    message.role === "assistant" ? "bg-muted/50 rounded-lg p-4" : ""
                }`}
            >
                {message.role === "assistant" && (
                    <div className="flex items-center mb-2">
                        <Sparkles className="h-5 w-5 text-primary mr-2" />
                        <span className="font-semibold">Code Assistant</span>
                    </div>
                )}
                {message.role === "user" && (
                    <div className="flex items-center mb-2">
                        <span className="font-semibold">You</span>
                    </div>
                )}
                <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
                {message.codeReferences && message.codeReferences.length > 0 && (
                    <div className="mt-4">
                        <p className="text-sm font-semibold mb-2">Code References:</p>
                        <div className="space-y-2">
                            {message.codeReferences.map((ref, index) => (
                                <div key={index} className="bg-muted rounded-md p-2 text-sm">
                                    <div className="flex justify-between mb-1">
                                        <span className="font-mono text-xs">{ref.path}</span>
                                        <span className="text-xs text-muted-foreground">
                                            Lines: {ref.lineNumbers}
                                        </span>
                                    </div>
                                    <pre className="bg-black/10 p-2 rounded overflow-x-auto text-xs">
                                        <code>{ref.snippet}</code>
                                    </pre>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen py-8 px-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <motion.div
                    className="text-center mb-8"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <Code className="w-6 h-6 text-primary" />
                        <h1 className="text-3xl font-light">Code Assistant</h1>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
                        Ask questions about your codebase and get answers based on your code.
                    </p>
                </motion.div>

                <div className="flex gap-6 relative">
                    {/* Settings Panel - conditionally show based on state */}
                    {isSettingsPanelExpanded && (
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: "100%", opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="w-full md:w-1/3 max-w-sm"
                        >
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                                    <CardTitle>Chat Settings</CardTitle>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setIsSettingsPanelExpanded(false)}
                                        className="h-8 w-8"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <RepoAndBranchSelection
                                        repo={repo}
                                        setRepo={setRepo}
                                        branch={branch}
                                        setBranch={setBranch}
                                        loading={isLoading || isIndexing}
                                    />

                                    <AIModelSelection
                                        selectedModel={selectedModel}
                                        setSelectedModel={setSelectedModel}
                                        loading={isLoading || isIndexing}
                                        recommendedModel={LLM_MODELS.ANTHROPIC_CLAUDE_3_7_SONNET}
                                    />

                                    <div className="pt-4">
                                        <Button
                                            onClick={refreshCodebaseIndex}
                                            disabled={isLoading || isIndexing || !repo || !branch}
                                            variant="outline"
                                            className="w-full"
                                        >
                                            {isIndexing ? (
                                                <>
                                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                                    Indexing...
                                                </>
                                            ) : (
                                                <>
                                                    <RefreshCw className="mr-2 h-4 w-4" />
                                                    Index Codebase
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {/* Chat Panel */}
                    <div className={`flex-1 ${!isSettingsPanelExpanded ? "w-full" : ""}`}>
                        <Card className="h-[calc(100vh-200px)] flex flex-col">
                            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                                <CardTitle>Code Assistant Chat</CardTitle>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                        setIsSettingsPanelExpanded(!isSettingsPanelExpanded)
                                    }
                                    className="h-8 w-8"
                                >
                                    {isSettingsPanelExpanded ? (
                                        <Maximize2 className="h-4 w-4" />
                                    ) : (
                                        <Minimize2 className="h-4 w-4" />
                                    )}
                                </Button>
                            </CardHeader>
                            <CardContent className="flex-1 overflow-hidden flex flex-col">
                                <ScrollArea className="flex-1 pr-4">
                                    {messages.map(renderMessage)}
                                    {isLoading && (
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-2/3" />
                                            <Skeleton className="h-4 w-full" />
                                            <Skeleton className="h-4 w-1/2" />
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </ScrollArea>
                                <div className="flex gap-2 pt-4">
                                    <Textarea
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Ask a question about your codebase..."
                                        className="flex-1 resize-none"
                                        disabled={isLoading || !repo || !branch}
                                        rows={2}
                                    />
                                    <Button
                                        onClick={handleSendMessage}
                                        disabled={isLoading || !repo || !branch || !message.trim()}
                                        size="icon"
                                        className="self-end"
                                    >
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatAssistant;
