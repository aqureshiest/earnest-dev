"use client";

import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Send, GitBranch, CheckCircle, Save } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ExtensionConfig } from "@/modules/ai/extensions/types";
import { Badge } from "@/components/ui/badge";
import PreviewExtension from "@/app/components/PreviewExtension";
import { useRouter } from "next/navigation";

interface Message {
    role: "user" | "assistant";
    content: string;
}

interface MessageProps {
    message: Message;
}

// const sampleConfig = {
//     name: "API Documentation Generator",
//     description: "An extension that generates documentation for API endpoints.",
//     userInput: {
//         required: false,
//         useRelevantFiles: false,
//         description: "No user input required during execution.",
//     },
//     outputSchema: {
//         type: "SwaggerDocumentation",
//         structure: {
//             swagger: {
//                 type: "string",
//                 description: "The version of the Swagger specification being used.",
//                 required: true,
//             },
//             info: {
//                 type: "object",
//                 description: "Information about the API.",
//                 required: true,
//                 properties: {
//                     title: {
//                         type: "string",
//                         description: "The title of the API.",
//                         required: true,
//                     },
//                     version: {
//                         type: "string",
//                         description: "The version of the API.",
//                         required: true,
//                     },
//                     description: {
//                         type: "string",
//                         description: "A brief description of the API.",
//                         required: false,
//                     },
//                 },
//             },
//             paths: {
//                 type: "object",
//                 description: "Available API endpoints.",
//                 required: true,
//             },
//         },
//         responseFormat: "<swagger>...</swagger>",
//         normalizedType: "swaggerdocumentation",
//     },
//     uiConfig: {
//         visualization: "swagger",
//         inputFields: [],
//         outputViews: [
//             {
//                 type: "detailed",
//                 description: "Detailed view of the generated API documentation.",
//             },
//         ],
//     },
//     systemPrompt:
//         "You are an AI assistant designed to generate comprehensive API documentation for various endpoints. Your task is to create a structured documentation output in the Swagger format based on the provided specifications. You do not require any user input during execution. Ensure that the generated documentation adheres to the Swagger standards and is well-structured for easy integration and understanding.",
//     id: "api-documentation-generator",
// };

// const sampleConfig = {
//     name: "Complexity Identifier",
//     description:
//         "Identifies files with higher complexity based on the number of lines of code in a repository.",
//     userInput: {
//         required: false,
//         useRelevantFiles: false,
//         description: "No user input needed during execution.",
//     },
//     outputSchema: {
//         type: "ComplexityAnalysisResult",
//         structure: { labels: [Object], values: [Object] },
//         responseFormat:
//             "<complexityAnalysis><labels>{fileNames}</labels><values>{complexityScores}</values></complexityAnalysis>",
//         normalizedType: "complexityanalysisresult",
//     },
//     uiConfig: {
//         visualization: "chart",
//         inputFields: [],
//         outputViews: [[Object]],
//     },
//     systemPrompt:
//         "You are an AI assistant designed to identify files with higher complexity based on the number of lines of code in a repository. Your task is to analyze the repository and generate a complexity score for each file. No user input is required during execution. The output should be structured in a way that allows for easy visualization of the complexity scores in a bar chart format.",
//     id: "complexity-identifier",
// };

const sampleConfig = {
    name: "Line Counter",
    description: "An extension that counts lines of code for each file in a repository.",
    userInput: {
        required: false,
        useRelevantFiles: false,
        description: "The extension scans the entire repository without requiring user input.",
    },
    outputSchema: {
        type: "LineCountResult",
        structure: {
            fileName: {
                type: "string",
                description: "The name of the file in the repository",
                required: true,
            },
            lineCount: {
                type: "number",
                description: "The total number of lines in the file",
                required: true,
            },
        },
        responseFormat:
            "<lineCountResults><file><fileName>{fileName}</fileName><lineCount>{lineCount}</lineCount></file></lineCountResults>",
        normalizedType: "linecountresult",
    },
    uiConfig: {
        visualization: "table",
        inputFields: [],
        outputViews: [
            {
                type: "table",
                description: "A table displaying the line count for each file in the repository.",
            },
        ],
    },
    systemPrompt:
        "You are an AI assistant designed to count the lines of code in each file of a repository. Your task is to scan the entire repository and provide a detailed count of lines for each file without requiring any user input. Ensure that the output is structured in a clear and organized manner, suitable for analysis and review.",
    id: "line-counter",
};

const Message: React.FC<MessageProps> = ({ message }) => (
    <div className={`flex gap-3 mb-4 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
        {message.role === "assistant" && (
            <Avatar className="h-8 w-8">
                {/* <AvatarImage src="/ai.png" alt="AI Assistant" /> */}
                <AvatarFallback>AI</AvatarFallback>
            </Avatar>
        )}
        <div
            className={`max-w-[80%] rounded-lg p-2 ${
                message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}
        >
            {message.content}
        </div>
        {message.role === "user" && (
            <Avatar className="h-8 w-8">
                {/* <AvatarImage src="/human.png" alt="User" /> */}
                <AvatarFallback>ME</AvatarFallback>
            </Avatar>
        )}
    </div>
);

const ConfigPreview: React.FC<{ config: ExtensionConfig }> = ({ config }) => {
    // Helper to render configuration sections
    const renderSection = (title: string, content: React.ReactNode) => (
        <div className="mb-6">
            <h3 className="font-medium mb-2 flex items-center gap-2 text-sm">
                {title}
                {content && <CheckCircle className="h-4 w-4 text-green-500" />}
            </h3>
            <div className="text-sm">{content}</div>
        </div>
    );

    return (
        <div className="space-y-4">
            {renderSection("Name", config.name && <p className="text-sm">{config.name}</p>)}

            {renderSection(
                "Description",
                config.description && <p className="text-sm">{config.description}</p>
            )}

            {renderSection(
                "User Input",
                config.userInput && (
                    <div className="space-y-2">
                        <div className="flex gap-2">
                            <Badge variant={config.userInput.required ? "default" : "secondary"}>
                                {config.userInput.required ? "Input Required" : "No Input Required"}
                            </Badge>
                            {config.userInput.required && (
                                <Badge
                                    variant={
                                        config.userInput.useRelevantFiles ? "default" : "secondary"
                                    }
                                >
                                    {config.userInput.useRelevantFiles
                                        ? "Uses Relevant Files"
                                        : "Uses All Files"}
                                </Badge>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {config.userInput.description}
                        </p>
                    </div>
                )
            )}

            {config.uiConfig?.inputFields?.length > 0 &&
                renderSection(
                    "Input Fields",
                    <div className="space-y-2">
                        {config.uiConfig.inputFields.map((field, index) => (
                            <div key={index} className="bg-muted p-2 rounded-md mb-2">
                                <p className="text-sm font-medium">{field.name}</p>
                                <p className="text-xs text-muted-foreground">{field.description}</p>
                            </div>
                        ))}
                    </div>
                )}

            {config.outputSchema &&
                renderSection(
                    "Output Format",
                    <div className="space-y-2">
                        <p className="text-sm">{config.outputSchema.type}</p>
                        <pre className="bg-muted p-2 rounded-md text-xs whitespace-pre-wrap overflow-x-auto max-h-48">
                            {JSON.stringify(config.outputSchema.structure, null, 2)}
                        </pre>
                    </div>
                )}

            {config.uiConfig?.outputViews?.length > 0 &&
                renderSection(
                    "Output Views",
                    <div className="space-y-2">
                        {config.uiConfig.outputViews.map((view, index) => (
                            <div key={index} className="bg-muted p-2 rounded-md mb-2">
                                <p className="text-sm font-medium">{view.type}</p>
                                <p className="text-xs text-muted-foreground">{view.description}</p>
                            </div>
                        ))}
                    </div>
                )}

            {config.systemPrompt &&
                renderSection(
                    "System Prompt",
                    <pre className="bg-muted p-2 rounded-md text-xs whitespace-pre-wrap overflow-x-auto max-h-64">
                        {config.systemPrompt}
                    </pre>
                )}
        </div>
    );
};

const CreateExtensionPage: React.FC = () => {
    const router = useRouter();

    const [messages, setMessages] = useState<Message[]>([
        {
            role: "assistant",
            content:
                "Hi! Let's create an AI extension together. Could you describe what kind of extension you'd like to build? What problem should it solve?",
        },
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [config, setConfig] = useState<Partial<ExtensionConfig> | null>(null);
    const chatScrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatScrollAreaRef.current) {
            const scrollElement = chatScrollAreaRef.current.querySelector(
                "[data-radix-scroll-area-viewport]"
            );
            if (scrollElement) {
                scrollElement.scrollTop = scrollElement.scrollHeight;
            }
        }
    }, [messages]);

    const handleSendMessage = async () => {
        if (!input.trim() || loading) return;

        setLoading(true);
        setError(null);

        const newMessages: Message[] = [...messages, { role: "user", content: input }];
        setMessages(newMessages);
        setInput("");

        try {
            const response = await fetch("/api/extension/generate-config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: newMessages,
                    currentConfig: config,
                }),
            });

            if (!response.ok) throw new Error("Failed to generate configuration");

            const data: { message: string; config?: ExtensionConfig } = await response.json();

            setMessages((prev) => [...prev, { role: "assistant", content: data.message }]);

            if (data.config) {
                setConfig(data.config);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleSaveExtension = async () => {
        if (!config?.id) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/extension/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(config),
            });

            if (!response.ok) throw new Error("Failed to save extension");

            const { id } = await response.json();
            router.push(`/extensions/${id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen py-8 px-6">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-semibold text-center mb-8">Create Extension</h1>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Side - Chat Interface */}
                    <Card className="shadow-lg h-[700px]">
                        <CardHeader>
                            <CardTitle>Chat</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col h-[calc(100%-5rem)]">
                            <ScrollArea className="flex-1 pr-4" ref={chatScrollAreaRef}>
                                {messages.map((message, index) => (
                                    <Message key={index} message={message} />
                                ))}
                            </ScrollArea>

                            {error && (
                                <Alert variant="destructive" className="my-2">
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            <div className="mt-4 flex gap-2">
                                <Input
                                    placeholder="Describe your extension..."
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyPress}
                                    disabled={loading}
                                />
                                <Button onClick={handleSendMessage} disabled={loading}>
                                    {loading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Send className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-lg h-[700px] flex flex-col">
                        <CardHeader className="flex-none flex flex-row items-center justify-between">
                            <CardTitle>Extension Preview</CardTitle>
                            <PreviewExtension config={sampleConfig as ExtensionConfig} />
                            {config?.systemPrompt && (
                                <div className="flex gap-2">
                                    <PreviewExtension
                                        config={config as ExtensionConfig}
                                        disabled={loading}
                                    />
                                    <Button
                                        onClick={handleSaveExtension}
                                        disabled={loading}
                                        size="sm"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="mr-2 h-4 w-4" />
                                                Save Extension
                                            </>
                                        )}
                                    </Button>
                                </div>
                            )}
                        </CardHeader>
                        <CardContent className="flex-1 overflow-hidden">
                            <ScrollArea className="h-full">
                                {config ? (
                                    <ConfigPreview config={config as ExtensionConfig} />
                                ) : (
                                    <div className="text-center text-muted-foreground py-8">
                                        Start describing your extension to see the preview here
                                    </div>
                                )}
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default CreateExtensionPage;
