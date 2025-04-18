import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProgressFeedProps {
    progress: string[];
    slim?: boolean;
}

const ProgressFeed: React.FC<ProgressFeedProps> = ({ progress, slim = false }) => {
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
    }, [progress, slim]);

    if (slim) {
        // Slim view: Show only the latest message
        const latestMessage = progress[progress.length - 1] || "No progress yet";
        return (
            <Card className="flex items-center h-12 px-4">
                <p
                    className={`text-sm truncate ${
                        latestMessage.toLowerCase().includes("error")
                            ? "text-red-500"
                            : "text-foreground"
                    }`}
                >
                    {latestMessage}
                </p>
            </Card>
        );
    }

    // Full view: Show the complete progress feed
    return (
        <Card>
            <CardHeader>
                <CardTitle>Progress Feed</CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[240px] pr-4" ref={scrollAreaRef}>
                    <AnimatePresence initial={false}>
                        {progress.map((message, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.2 }}
                                className="mb-2"
                            >
                                <div
                                    className={`p-2 ${
                                        message?.startsWith("*") ? "bg-muted" : "bg-muted"
                                    } rounded-md`}
                                >
                                    <p
                                        className={`text-sm ${
                                            message?.toLowerCase().includes("error")
                                                ? "text-red-500"
                                                : "text-foreground"
                                        }`}
                                    >
                                        {message?.startsWith("*") ? (
                                            <span className="flex items-center">
                                                <span className="mr-2 text-primary">└─</span>
                                                <span>{message?.slice(1)}</span>
                                            </span>
                                        ) : (
                                            message
                                        )}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};

export default ProgressFeed;
