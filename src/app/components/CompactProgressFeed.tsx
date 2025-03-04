import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Terminal } from "lucide-react";
import Markdown from "react-markdown";

export interface EnhancedProgressMessage {
    message: string;
    content: string;
    type: string;
    isMarkdown?: boolean;
    timestamp?: number;
}

interface CompactProgressFeedProps {
    messages: EnhancedProgressMessage[];
    maxHeight?: string;
}

const CompactProgressFeed: React.FC<CompactProgressFeedProps> = ({
    messages,
    maxHeight = "200px",
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (messages.length === 0) {
        return null;
    }

    // Get the most recent non-markdown message as a summary
    const recentMessages = messages.filter((msg) => !msg.isMarkdown).slice(-3);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center space-x-2">
                        <Terminal className="h-4 w-4" />
                        <CardTitle className="text-sm font-medium">Progress</CardTitle>
                        <Badge variant="outline">{messages.length}</Badge>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
                        {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                        ) : (
                            <ChevronDown className="h-4 w-4" />
                        )}
                    </Button>
                </CardHeader>

                <CardContent className="p-0">
                    {!isExpanded ? (
                        // Compact view - show just recent messages
                        <div className="px-4 py-2">
                            {recentMessages.map((msg, index) => (
                                <div key={index} className="text-sm py-1 text-muted-foreground">
                                    {msg.message}
                                </div>
                            ))}
                            {messages.length > 3 && (
                                <div className="text-xs text-center mt-1 text-muted-foreground">
                                    + {messages.length - 3} more messages
                                </div>
                            )}
                        </div>
                    ) : (
                        // Expanded view - show all messages with scrolling
                        <div className="p-4 overflow-auto border-t" style={{ maxHeight }}>
                            {messages.map((message, index) => (
                                <div
                                    key={index}
                                    className={`mb-2 last:mb-0 ${
                                        message.type === "error"
                                            ? "text-destructive"
                                            : message.type === "success"
                                            ? "text-green-500"
                                            : ""
                                    }`}
                                >
                                    {message.isMarkdown ? (
                                        <div className="prose prose-sm dark:prose-invert max-w-none">
                                            <Markdown>{message.content}</Markdown>
                                        </div>
                                    ) : (
                                        <div className="text-sm">{message.message}</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
};

export default CompactProgressFeed;
