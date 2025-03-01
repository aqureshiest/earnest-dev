import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";

export interface EnhancedProgressMessage {
    content: string;
    type?: string; //"info" | "error" | "success" | "warning";
    timestamp?: Date;
    isMarkdown?: boolean;
}

interface EnhancedProgressFeedProps {
    messages: EnhancedProgressMessage[];
    slim?: boolean;
    title?: string;
    maxHeight?: string;
}

const EnhancedProgressFeed: React.FC<EnhancedProgressFeedProps> = ({
    messages,
    slim = false,
    title = "Progress Feed",
    maxHeight = "240px",
}) => {
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollAreaRef.current && !slim) {
            const scrollElement = scrollAreaRef.current.querySelector(
                "[data-radix-scroll-area-viewport]"
            );
            if (scrollElement) {
                scrollElement.scrollTop = scrollElement.scrollHeight;
            }
        }
    }, [messages, slim]);

    // Helper function to get message style based on type
    const getMessageStyle = (type?: string) => {
        switch (type) {
            case "error":
                return "bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-800";
            case "success":
                return "bg-green-100 dark:bg-green-900/20 border-green-300 dark:border-green-800";
            case "warning":
                return "bg-yellow-100 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-800";
            default:
                return "bg-muted border-muted-foreground/20";
        }
    };

    // Helper function to get text style based on type
    const getTextStyle = (type?: string) => {
        switch (type) {
            case "error":
                return "text-red-700 dark:text-red-400";
            case "success":
                return "text-green-700 dark:text-green-400";
            case "warning":
                return "text-yellow-700 dark:text-yellow-400";
            default:
                return "text-foreground";
        }
    };

    if (slim) {
        // Slim view: Show only the latest message
        const latestMessage = messages[messages.length - 1];

        if (!latestMessage) {
            return (
                <Card className="flex items-center h-12 px-4">
                    <p className="text-sm text-muted-foreground">No progress yet</p>
                </Card>
            );
        }

        return (
            <Card className="flex items-center h-12 px-4">
                <p className={`text-sm truncate ${getTextStyle(latestMessage.type)}`}>
                    {latestMessage.content}
                </p>
            </Card>
        );
    }

    // Full view: Show the complete progress feed
    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea
                    className={`pr-4 mt-2`}
                    style={{ height: maxHeight }}
                    ref={scrollAreaRef}
                >
                    <AnimatePresence initial={false}>
                        {messages.map((message, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.2 }}
                                className="mb-3"
                            >
                                <div
                                    className={`p-2 rounded-lg border ${getMessageStyle(
                                        message.type
                                    )} ${message.content?.startsWith("*") ? "pl-6" : ""}`}
                                >
                                    {message.timestamp && (
                                        <div className="text-xs text-muted-foreground mb-1">
                                            {message.timestamp.toLocaleTimeString()}
                                        </div>
                                    )}

                                    {message.content?.startsWith("*") ? (
                                        <div className="flex items-start">
                                            <div
                                                className={`text-sm ${getTextStyle(message.type)}`}
                                            >
                                                {message.isMarkdown ? (
                                                    <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none">
                                                        {message.content.replace(/^\*\s*/, "- ")}
                                                    </ReactMarkdown>
                                                ) : (
                                                    message.content.replace(/^\*\s*/, "- ")
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={`text-sm ${getTextStyle(message.type)}`}>
                                            {message.isMarkdown ? (
                                                <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none">
                                                    {message.content}
                                                </ReactMarkdown>
                                            ) : (
                                                message.content
                                            )}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};

export default EnhancedProgressFeed;
