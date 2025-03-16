"use client";

import React, { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
// import MermaidDiagram from "@/app/components/MermaidDiagram";

interface MessageMetadata {
    contentType?: "text" | "mermaid" | "code" | "image";
    language?: string;
    title?: string;
    [key: string]: any;
}

interface Message {
    id: string;
    role: "user" | "assistant" | "system" | "tool";
    content: string;
    toolName?: string;
    pending?: boolean;
    metadata?: MessageMetadata;
}

interface SSEEvent {
    type: string;
    message: string;
    data?: any;
}

export default function ExecutorPage() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "welcome",
            role: "assistant",
            content: "Hello! I'm Executor, your AI assistant. How can I help you today?",
        },
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [conversationId, setConversationId] = useState(uuidv4());
    const [pendingAssistantId, setPendingAssistantId] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom of messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!input.trim() || loading) return;

        // Add user message
        const userMessage: Message = {
            id: uuidv4(),
            role: "user",
            content: input,
        };

        // Add placeholder for assistant response
        const assistantId = uuidv4();
        const assistantMessage: Message = {
            id: assistantId,
            role: "assistant",
            content: "",
            pending: true,
        };

        setMessages((prev) => [...prev, userMessage, assistantMessage]);
        setPendingAssistantId(assistantId);
        setInput("");
        setLoading(true);

        try {
            // Call the API endpoint
            const response = await fetch("/api/executor-ai", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: input,
                    conversationId,
                }),
            });

            if (!response.ok || !response.body) {
                throw new Error("Failed to send message");
            }

            // Process streaming response
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let responseContent = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split("\n\n");

                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        const eventData = line.substring(6);
                        try {
                            const parsedEvent: SSEEvent = JSON.parse(eventData);
                            handleSSEEvent(parsedEvent, assistantId, responseContent);

                            if (parsedEvent.type === "complete") {
                                responseContent = parsedEvent.message;
                            }
                        } catch (error) {
                            console.error("Error parsing SSE message:", error);
                        }
                    }
                }
            }

            // Update assistant message with final content
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === assistantId
                        ? { ...msg, content: responseContent, pending: false }
                        : msg
                )
            );
        } catch (error) {
            console.error("Error sending message:", error);
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === assistantId
                        ? {
                              ...msg,
                              content: "Sorry, there was an error processing your request.",
                              pending: false,
                          }
                        : msg
                )
            );
        } finally {
            setLoading(false);
            setPendingAssistantId(null);
        }
    };

    const handleSSEEvent = (event: SSEEvent, assistantId: string, currentContent: string) => {
        switch (event.type) {
            case "thinking":
            case "progress":
                // Update assistant message with progress
                setMessages((prev) =>
                    prev.map((msg) =>
                        msg.id === assistantId ? { ...msg, content: currentContent + "..." } : msg
                    )
                );
                break;

            case "tool_start":
                // Add a tool message
                const toolStartId = uuidv4();
                setMessages((prev) => [
                    ...prev,
                    {
                        id: toolStartId,
                        role: "tool",
                        toolName: event.data?.toolName,
                        content: `Using tool: ${event.data?.toolName}`,
                        pending: true,
                    },
                ]);
                break;

            case "tool_end":
                // Update tool messages
                setMessages((prev) =>
                    prev.map((msg) =>
                        msg.role === "tool" && msg.toolName === event.data?.toolName && msg.pending
                            ? {
                                  ...msg,
                                  content: event.data?.response?.content || msg.content,
                                  pending: false,
                                  metadata: event.data?.response?.metadata,
                              }
                            : msg
                    )
                );
                break;

            case "complete":
                // Final message
                setMessages((prev) =>
                    prev.map((msg) =>
                        msg.id === assistantId
                            ? { ...msg, content: event.message, pending: false }
                            : msg
                    )
                );
                break;

            case "error":
                // Show error
                setMessages((prev) =>
                    prev.map((msg) =>
                        msg.id === assistantId
                            ? { ...msg, content: `Error: ${event.message}`, pending: false }
                            : msg
                    )
                );
                break;
        }
    };

    const clearChat = () => {
        setMessages([
            {
                id: "welcome",
                role: "assistant",
                content: "Chat cleared. How can I help you?",
            },
        ]);
        setConversationId(uuidv4());
    };

    return (
        <div className="min-h-screen py-8 px-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <motion.div
                    className="text-center mb-8"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <Sparkles className="w-6 h-6 text-primary" />
                        <h1 className="text-3xl font-light">Executor AI Assistant</h1>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
                        A powerful AI assistant with tools that can help you accomplish tasks
                    </p>
                </motion.div>

                {/* Chat container */}
                <Card className="mb-4">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Chat</CardTitle>
                            <Button variant="outline" size="sm" onClick={clearChat}>
                                Clear Chat
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4 max-h-[600px] overflow-y-auto p-1">
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`flex ${
                                        message.role === "user" ? "justify-end" : "justify-start"
                                    }`}
                                >
                                    <div
                                        className={`rounded-lg px-4 py-2 max-w-[80%] ${
                                            message.role === "user"
                                                ? "bg-primary text-primary-foreground"
                                                : message.role === "tool"
                                                ? "bg-purple-100 dark:bg-purple-900 text-foreground"
                                                : "bg-muted text-foreground"
                                        }`}
                                    >
                                        {message.role === "tool" && message.toolName && (
                                            <div className="text-xs font-bold mb-1">
                                                {message.toolName}
                                            </div>
                                        )}
                                        <div className="whitespace-pre-wrap">
                                            {message.pending ? (
                                                <div className="flex items-center">
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    Thinking...
                                                </div>
                                            ) : message.metadata?.contentType === "mermaid" ? (
                                                // <MermaidDiagram
                                                //     code={message.content}
                                                //     title={message.metadata.title}
                                                //     className="mt-2"
                                                // />
                                                <span>Not Implmented yet</span>
                                            ) : message.metadata?.contentType === "code" ? (
                                                <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-auto">
                                                    <code>{message.content}</code>
                                                </pre>
                                            ) : (
                                                message.content
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                    </CardContent>
                </Card>

                {/* Input form */}
                <form onSubmit={handleSubmit} className="flex flex-col space-y-2">
                    <Textarea
                        placeholder="Type your message here..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="resize-none"
                        rows={3}
                        disabled={loading}
                    />
                    <Button type="submit" disabled={loading || !input.trim()}>
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <Send className="h-4 w-4 mr-2" />
                                Send
                            </>
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
}
