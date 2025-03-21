"use client";

import { LLM_MODELS } from "@/modules/utils/llmInfo";
import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Brain, Code, Send, Loader2, RefreshCw, Maximize2, Minimize2 } from "lucide-react";
import EnhancedProgressFeed, {
    EnhancedProgressMessage,
} from "@/app/components/EnhancedProgressFeed";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import MarkdownViewer from "../components/MarkdownViewer";
import RepoAndBranchSelection from "../components/RepoAndBranchSelection";
import AIModelSelection from "../components/AIModelSelection";

interface Message {
    role: "user" | "assistant" | "system";
    content: string;
    timestamp?: Date;
}

// Template Questions Component
const TemplateQuestions = ({
    questions,
    onSelectQuestion,
}: {
    questions: string[];
    onSelectQuestion: any;
}) => {
    return (
        <div className="px-4 py-3 mb-4">
            <div className="grid grid-cols-1 gap-2">
                {questions.map((question, index) => (
                    <button
                        key={index}
                        onClick={() => onSelectQuestion(question)}
                        className="text-left p-3 border rounded-lg hover:bg-muted/50 transition-colors text-sm w-full"
                    >
                        {question}
                    </button>
                ))}
            </div>
        </div>
    );
};

const CodebaseQA: React.FC = () => {
    const [taskId, setTaskId] = useState("");
    const [repo, setRepo] = useState<string>("");
    const [branch, setBranch] = useState<string>("");
    const [selectedModel, setSelectedModel] = useState<string>("");

    const [question, setQuestion] = useState("");
    const [progressMessages, setProgressMessages] = useState<EnhancedProgressMessage[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isRepoDialogOpen, setIsRepoDialogOpen] = useState(false);
    const [useConversationHistory, setUseConversationHistory] = useState(true);
    const [showTemplateQuestions, setShowTemplateQuestions] = useState(false);

    const [isExpanded, setIsExpanded] = useState(false);

    const helpMessage = `**Codebase Q&A**
- Select a repository to explore your code
- **Conversation Mode** ON to ask follow up questions (limit to a few questions)
- **Conversation Mode** OFF for independent questions
- Use **New Conversation** to start fresh
- First analysis may take a longer time to process the codebase
`;

    const [templateQuestions] = useState([
        "Explain how this repo works?",
        "Generate an architecture diagram of this codebase",
        "Identify potential improvements in this code",
    ]);

    const [conversation, setConversation] = useState<Message[]>([
        {
            role: "system",
            content: helpMessage,
            timestamp: new Date(),
        },
    ]);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const owner = process.env.NEXT_PUBLIC_GITHUB_OWNER!;

    // Scroll to bottom when new messages are added
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [conversation]);

    // Show template questions when repo/branch selected and no conversation yet
    useEffect(() => {
        if (repo && branch && conversation.length <= 1) {
            setShowTemplateQuestions(true);
        } else {
            setShowTemplateQuestions(false);
        }
    }, [repo, branch, conversation.length]);

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

    const handleSelectTemplateQuestion = (templateQuestion: any) => {
        setQuestion(templateQuestion);
        setShowTemplateQuestions(false);
    };

    const handleSubmitQuestion = async () => {
        console.log("Submitting question:", question);
        if (!question.trim() || !repo || !branch || isProcessing) return;
        console.log("Processing question...");

        setIsProcessing(true);
        const newTaskId = Date.now().toString();
        setTaskId(newTaskId);

        // Add the question to the conversation
        const userMessage: Message = {
            role: "user",
            content: question,
            timestamp: new Date(),
        };
        setConversation((prev) => [...prev, userMessage]);

        // Add a loading state message (will be replaced when response arrives)
        const loadingMessage: Message = {
            role: "assistant",
            content: "",
            timestamp: new Date(),
        };
        setConversation((prev) => [...prev, loadingMessage]);

        // Prepare conversation history (excluding system messages and the current question)
        let conversationHistory: string[] = [];

        if (useConversationHistory) {
            conversationHistory = conversation
                .filter((msg) => msg.role !== "system") // Exclude system messages
                .map((msg) => msg.content);
        }

        // Clear input and set progress messages
        setQuestion("");
        setProgressMessages([]);

        if (useConversationHistory && conversationHistory.length > 0) {
            addProgressMessage(`Processing follow-up question with conversation context...`);
        } else {
            addProgressMessage(`Processing question about ${repo}/${branch}`);
        }

        try {
            const response = await fetch(`/api/codebase-qa`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    taskId: newTaskId,
                    owner,
                    repo,
                    branch,
                    selectedModel,
                    question: question.trim(),
                    conversationHistory: useConversationHistory ? conversationHistory : [],
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to process question");
            }

            await handleStreamResponse(response);
        } catch (error: any) {
            console.error("Error:", error);
            addProgressMessage(`Error: ${error.message}`, "error");

            // Replace the loading message with error
            setConversation((prev) => {
                const newConv = [...prev];
                // Replace the last message (loading) with error
                if (newConv.length > 0 && newConv[newConv.length - 1].role === "assistant") {
                    newConv[newConv.length - 1] = {
                        role: "assistant",
                        content: `Error: ${error.message}`,
                        timestamp: new Date(),
                    };
                }
                return newConv;
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleStreamResponse = async (response: Response) => {
        const reader = response.body?.getReader();
        if (!reader) throw new Error("Failed to get stream reader");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            buffer += chunk;

            const events = buffer.split("\n\n");
            buffer = events.pop() || "";

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
                addProgressMessage(data.message);
                break;
            case "answer":
                // Replace the loading message with the actual answer
                setConversation((prev) => {
                    const newConv = [...prev];
                    // Replace the last message (loading) with answer
                    if (newConv.length > 0 && newConv[newConv.length - 1].role === "assistant") {
                        newConv[newConv.length - 1] = {
                            role: "assistant",
                            content: data.message,
                            timestamp: new Date(),
                        };
                    }
                    return newConv;
                });
                break;
            case "error":
                addProgressMessage(data.message, "error");
                // Replace the loading message with error
                setConversation((prev) => {
                    const newConv = [...prev];
                    // Replace the last message (loading) with error
                    if (newConv.length > 0 && newConv[newConv.length - 1].role === "assistant") {
                        newConv[newConv.length - 1] = {
                            role: "assistant",
                            content: `Error: ${data.message}`,
                            timestamp: new Date(),
                        };
                    }
                    return newConv;
                });
                break;
            case "final":
                addProgressMessage(data.message, "success");
                break;
        }
    };

    // Handle pressing "Enter" to submit
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleSubmitQuestion();
        }
    };

    // Start a new conversation
    const handleStartNewConversation = () => {
        setConversation([]);
        setQuestion("");
        setProgressMessages([]);
        setShowTemplateQuestions(!!repo && !!branch);
        addProgressMessage("Started a new conversation", "info");
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 py-8 px-6 relative">
            {/* Grid pattern background */}
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
            <div className="absolute inset-0 hidden dark:block bg-grid-pattern opacity-3"></div>

            {/* Content container - wider */}
            <div className="max-w-[1400px] mx-auto relative z-10">
                {/* Header */}
                <motion.div
                    className="flex items-center justify-between mb-6"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="flex items-center gap-3">
                        <Brain className="w-6 h-6 text-primary" />
                        <h1 className="text-3xl font-light">Codebase Q&A</h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="conversation-mode"
                                checked={useConversationHistory}
                                onCheckedChange={setUseConversationHistory}
                            />
                            <Label htmlFor="conversation-mode">Conversation Mode</Label>
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleStartNewConversation}
                            className="flex items-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4" />
                            New Conversation
                        </Button>

                        <Dialog open={isRepoDialogOpen} onOpenChange={setIsRepoDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="flex items-center gap-2">
                                    <Code className="w-4 h-4" />
                                    {repo ? `${repo}/${branch}` : "Select Repository"}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                    <DialogTitle>Select Repository</DialogTitle>
                                    <DialogDescription>
                                        Choose the repository and branch you want to analyze.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="py-4">
                                    <RepoAndBranchSelection
                                        repo={repo}
                                        setRepo={setRepo}
                                        branch={branch}
                                        setBranch={setBranch}
                                        loading={isProcessing}
                                    />
                                </div>
                                <div>
                                    <AIModelSelection
                                        selectedModel={selectedModel}
                                        setSelectedModel={setSelectedModel}
                                        loading={isProcessing}
                                        recommendedModel={LLM_MODELS.AWS_BEDROCK_CLAUDE_37_SONNET}
                                    />
                                </div>
                                {/* CLose Button Footer */}
                                <DialogFooter>
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsRepoDialogOpen(false)}
                                    >
                                        Close
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Main Chat Area - dynamically sized based on expanded state */}
                    <Card
                        className={`h-[calc(100vh-150px)] flex flex-col relative ${
                            isExpanded ? "md:col-span-4" : "md:col-span-3"
                        }`}
                    >
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="absolute top-2 right-2 h-8 w-8 z-10 hidden md:flex"
                            title={isExpanded ? "Collapse" : "Expand"}
                        >
                            <Maximize2 className={isExpanded ? "hidden" : "h-4 w-4"} />
                            <Minimize2 className={isExpanded ? "h-4 w-4" : "hidden"} />
                        </Button>
                        <CardContent className="flex-grow overflow-hidden p-0 flex flex-col">
                            {/* Conversation History */}
                            <ScrollArea className="flex-grow p-4">
                                <div className="space-y-4">
                                    {conversation.map((message, index) => (
                                        <div
                                            key={index}
                                            className={`flex ${
                                                message.role === "user"
                                                    ? "justify-end"
                                                    : message.role === "system"
                                                    ? "justify-center"
                                                    : "justify-start"
                                            }`}
                                        >
                                            <div
                                                className={`flex gap-3 max-w-[85%] ${
                                                    message.role === "system" ? "w-full" : ""
                                                }`}
                                            >
                                                {message.role === "assistant" && (
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarFallback>AI</AvatarFallback>
                                                    </Avatar>
                                                )}

                                                <div
                                                    className={`p-4 rounded-lg ${
                                                        message.role === "user"
                                                            ? "bg-primary text-primary-foreground"
                                                            : message.role === "system"
                                                            ? "bg-muted text-center w-full"
                                                            : "bg-card border"
                                                    }`}
                                                >
                                                    {message.role === "user" ? (
                                                        <div className="whitespace-pre-wrap">
                                                            {message.content}
                                                        </div>
                                                    ) : message.content ? (
                                                        <MarkdownViewer content={message.content} />
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                            <span>Working on it...</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {message.role === "user" && (
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarFallback>U</AvatarFallback>
                                                    </Avatar>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {/* Template Questions - Inside the chat window */}
                                    {showTemplateQuestions && !isProcessing && (
                                        <div className="mt-4">
                                            <p className="text-sm text-muted-foreground px-4 mb-1">
                                                Try asking:
                                            </p>
                                            <TemplateQuestions
                                                questions={templateQuestions}
                                                onSelectQuestion={handleSelectTemplateQuestion}
                                            />
                                        </div>
                                    )}

                                    <div ref={messagesEndRef} />
                                </div>
                            </ScrollArea>

                            {/* Question Input */}
                            <div className="p-4 border-t mt-auto">
                                {/* Textarea and send button in their own flex container */}
                                <div className="flex gap-2">
                                    <Textarea
                                        value={question}
                                        onChange={(e) => setQuestion(e.target.value)}
                                        placeholder={
                                            !repo || !branch
                                                ? "Please select a repository first →"
                                                : useConversationHistory && conversation.length > 1
                                                ? "Ask a follow-up question..."
                                                : "Ask a question about your codebase..."
                                        }
                                        className="resize-none min-h-[80px] flex-1 p-3 border-primary/20 focus-visible:ring-1 focus-visible:ring-primary"
                                        disabled={isProcessing || !repo || !branch}
                                        onKeyDown={handleKeyDown}
                                    />
                                    <Button
                                        onClick={handleSubmitQuestion}
                                        disabled={
                                            isProcessing || !question.trim() || !repo || !branch
                                        }
                                        className="self-end h-10"
                                        size="default"
                                    >
                                        {isProcessing ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Send className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                    {useConversationHistory
                                        ? "Conversation mode ON: Your questions will include context from previous exchanges."
                                        : "Conversation mode OFF: Each question is treated independently."}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Progress Feed - hidden when expanded */}
                    {!isExpanded && (
                        <div className="h-[calc(100vh-150px)] flex flex-col">
                            <EnhancedProgressFeed messages={progressMessages} maxHeight="500px" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CodebaseQA;
