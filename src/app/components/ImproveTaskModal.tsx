"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Wand2, ArrowRight, RefreshCw } from "lucide-react";

interface ImproveTaskModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    originalDescription: string;
    onApply: (improvedDescription: string) => void;
}

const ImproveTaskModal: React.FC<ImproveTaskModalProps> = ({
    isOpen,
    onOpenChange,
    originalDescription,
    onApply,
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [improvedDescription, setImprovedDescription] = useState("");
    const [error, setError] = useState<string | null>(null);

    const improveTask = async () => {
        if (!originalDescription.trim()) {
            setError("Please enter a task description first");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/improve", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ description: originalDescription }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to improve task description");
            }

            const data = await response.json();
            setImprovedDescription(data.improved);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    const handleApply = () => {
        onApply(improvedDescription);
        onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Improve Task Description</DialogTitle>
                    {/* <DialogDescription>Enhance your task description with AI</DialogDescription> */}
                </DialogHeader>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 my-6">
                    <div className="space-y-2">
                        <div className="flex items-center ">
                            <h3 className="text-sm font-medium">Original</h3>
                            <Button
                                size="sm"
                                className="ml-2"
                                variant="secondary"
                                disabled={isLoading || !originalDescription.trim()}
                                onClick={improveTask}
                            >
                                {isLoading ? (
                                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <Wand2 className="h-4 w-4 mr-2" />
                                )}
                                Improve
                            </Button>
                        </div>
                        <div className="relative">
                            <Textarea value={originalDescription} readOnly className="h-56" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium mb-5">Improved</h3>
                        <Textarea
                            value={improvedDescription}
                            onChange={(e) => setImprovedDescription(e.target.value)}
                            placeholder="AI improved description will appear here..."
                            className="h-56"
                        />
                    </div>
                </div>

                {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleApply} disabled={!improvedDescription.trim()}>
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Apply Improved Description
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ImproveTaskModal;
