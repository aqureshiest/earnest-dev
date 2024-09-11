import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import RunLogsModal from "./RunLogsModal";

interface ProgressFeedProps {
    progress: string[];
    currentFile?: string;
}

const ProgressFeed: React.FC<ProgressFeedProps> = ({ progress, currentFile }) => {
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    const [isLogModalOpen, setIsLogModalOpen] = useState(false);

    useEffect(() => {
        if (scrollAreaRef.current) {
            const scrollElement = scrollAreaRef.current.querySelector(
                "[data-radix-scroll-area-viewport]"
            );
            if (scrollElement) {
                scrollElement.scrollTop = scrollElement.scrollHeight;
            }
        }
    }, [progress, currentFile]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Progress Feed</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[240px] overflow-y-auto pr-4" ref={scrollAreaRef}>
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
                                <div className="p-2 bg-muted rounded-md">
                                    <p className="text-sm text-foreground">
                                        {message.startsWith("*") ? (
                                            <span className="ml-4 flex items-center">
                                                <span className="mr-2 text-primary">•</span>
                                                {message.slice(1)}
                                            </span>
                                        ) : (
                                            message
                                        )}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {currentFile && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="mb-2 p-2 bg-primary/10 rounded-md flex items-center"
                        >
                            <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
                            <span className="text-sm text-primary-foreground">
                                Processing: {currentFile}
                            </span>
                        </motion.div>
                    )}
                </div>

                <Button
                    variant="outline"
                    className="mt-2 w-full"
                    onClick={() => setIsLogModalOpen(true)}
                >
                    View Logs
                </Button>
                {/* <RunLogsModal isOpen={isLogModalOpen} onClose={() => setIsLogModalOpen(false)} /> */}
            </CardContent>
        </Card>
    );
};

export default ProgressFeed;
