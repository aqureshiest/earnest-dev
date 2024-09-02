import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const ProgressFeed = ({ progress, currentFile }: { progress: any; currentFile: any }) => {
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    // Scroll to the bottom of the messages div whenever progress updates
    const scrollToBottom = () => {
        if (messagesContainerRef && messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [progress]);

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Progress Feed</h2>
            <div className="h-60 overflow-y-auto" ref={messagesContainerRef}>
                <AnimatePresence>
                    {progress.map((message: any, index: number) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="mb-2 p-2 bg-gray-100 rounded"
                        >
                            <p className="text-sm text-gray-700">
                                {message.startsWith("*") ? (
                                    <span className="ml-4">• {message.slice(1)}</span>
                                ) : (
                                    message
                                )}
                            </p>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {currentFile && (
                    <div className="mb-2 p-2 bg-gray-100 rounded flex items-center">
                        <motion.span
                            className="mr-2"
                            animate={{ opacity: [1, 0, 1] }}
                            transition={{ repeat: Infinity, duration: 1 }}
                        >
                            ●
                        </motion.span>
                        Processing: {currentFile}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProgressFeed;