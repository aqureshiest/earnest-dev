import React, { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    FileText,
    ListTodo,
    AlertTriangle,
    Clock,
    ChevronDown,
    ChevronUp,
    Grid,
    List,
    PenTool,
    Layers,
    CheckSquare,
    FileCode,
    GitBranch,
    Tag,
    Sparkles,
    Minimize,
    Maximize,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@radix-ui/react-tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import TechnicalDetailsRenderer from "../TechnicalDetailsRenderer";
import { Textarea } from "@/components/ui/textarea";

const priorityColors: Record<Ticket["priority"], string> = {
    High: "bg-red-500",
    Medium: "bg-yellow-500",
    Low: "bg-green-500",
};

const complexityColors: Record<string, string> = {
    High: "bg-purple-500",
    Medium: "bg-blue-500",
    Low: "bg-cyan-500",
};

interface TicketModalProps {
    ticket: Ticket;
    isOpen: boolean;
    onClose: () => void;
    tddContent: string;
    model: string;
    onUpdateTicket: (updatedTicket: Ticket) => void;
}

const TicketModal: React.FC<TicketModalProps> = ({
    ticket,
    isOpen,
    onClose,
    tddContent,
    model,
    onUpdateTicket,
}) => {
    const [currentTicket, setCurrentTicket] = useState<Ticket>(ticket);
    const [proposedTicket, setProposedTicket] = useState<Ticket | null>(null);
    const [isAIEnhancementOpen, setIsAIEnhancementOpen] = useState(false);
    const [aiEnhancementPrompt, setAIEnhancementPrompt] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [explanation, setExplanation] = useState<string | null>(null);

    useEffect(() => {
        setCurrentTicket(ticket);
    }, [ticket]);

    const handleAIEnhancement = async () => {
        setIsProcessing(true);
        try {
            const response = await fetch("/api/improve-ticket", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ticket: currentTicket,
                    tddContent,
                    userPrompt: aiEnhancementPrompt,
                    model,
                }),
            });

            if (!response.ok) throw new Error("Failed to enhance ticket");

            const data = await response.json();
            setProposedTicket(data.updatedTicket);
            setExplanation(data.explanation);
        } catch (error) {
            console.error("Error enhancing ticket:", error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAcceptChanges = () => {
        if (proposedTicket) {
            setCurrentTicket(proposedTicket);
            onUpdateTicket(proposedTicket);
            setProposedTicket(null);
            setExplanation(null);
            setAIEnhancementPrompt("");
            setIsAIEnhancementOpen(false);
        }
    };

    const handleRejectChanges = () => {
        setAIEnhancementPrompt("");
        setProposedTicket(null);
        setExplanation(null);
    };

    const ticketToDisplay = proposedTicket || currentTicket;

    // full sreen functionality
    const [isFullscreen, setIsFullscreen] = useState(false);
    const dialogRef = useRef<HTMLDivElement>(null);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            dialogRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);

        return () => {
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
        };
    }, []);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent
                className="max-w-[80vw] w-full max-h-[80vh] p-0 overflow-y-auto"
                ref={dialogRef}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="h-full flex flex-col"
                >
                    <DialogHeader className="p-6 bg-gray-100 dark:bg-gray-800 border-b">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <DialogTitle className="text-2xl">
                                    {ticketToDisplay.title}
                                </DialogTitle>
                                <Badge variant="outline">Ticket</Badge>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button variant="outline" onClick={toggleFullscreen}>
                                    {isFullscreen ? (
                                        <Minimize className="w-4 h-4" />
                                    ) : (
                                        <Maximize className="w-4 h-4" />
                                    )}
                                </Button>
                                <Button variant="outline" onClick={onClose}>
                                    Close
                                </Button>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* AI Enhancement section */}
                    <div className="bg-blue-50 dark:bg-blue-900 p-4 border-b">
                        <div
                            className="flex items-center justify-between cursor-pointer"
                            onClick={() => setIsAIEnhancementOpen(!isAIEnhancementOpen)}
                        >
                            <div className="flex items-center space-x-2">
                                <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                <span className="font-medium text-blue-600 dark:text-blue-400">
                                    Ask For Changes
                                </span>
                            </div>
                            {isAIEnhancementOpen ? (
                                <ChevronUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            ) : (
                                <ChevronDown className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            )}
                        </div>
                        {isAIEnhancementOpen && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{
                                    height: isAIEnhancementOpen ? "auto" : 0,
                                    opacity: isAIEnhancementOpen ? 1 : 0,
                                }}
                                transition={{ duration: 0.3 }}
                                className="mt-4 overflow-hidden px-4 py-2"
                            >
                                <Textarea
                                    placeholder="Describe what you would like to change..."
                                    value={aiEnhancementPrompt}
                                    onChange={(e) => setAIEnhancementPrompt(e.target.value)}
                                    className="mb-2"
                                />
                                <Button onClick={handleAIEnhancement} disabled={isProcessing}>
                                    {isProcessing ? "Processing..." : "Submit"}
                                </Button>
                            </motion.div>
                        )}
                    </div>

                    {proposedTicket && (
                        <div className="bg-green-50 dark:bg-green-900 p-4 border-b">
                            <p className="text-sm text-green-700 dark:text-green-300 mb-2">
                                {explanation}
                            </p>
                            <Button
                                onClick={handleAcceptChanges}
                                variant="default"
                                className="mr-2"
                            >
                                Accept Changes
                            </Button>
                            <Button onClick={handleRejectChanges} variant="outline">
                                Reject Changes
                            </Button>
                        </div>
                    )}

                    <div className="flex-grow">
                        <div className="flex flex-col md:flex-row h-full">
                            <div className="md:w-2/3 p-6">
                                <Card className="mb-6">
                                    <CardHeader>
                                        <CardTitle className="text-xl flex items-center">
                                            <PenTool className="w-5 h-5 mr-2" />
                                            User Story
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p>{ticketToDisplay.user_story}</p>
                                    </CardContent>
                                </Card>
                                <Card className="mb-6">
                                    <CardHeader>
                                        <CardTitle className="text-xl flex items-center">
                                            <FileText className="w-5 h-5 mr-2" />
                                            Description
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p>{ticketToDisplay.description}</p>
                                    </CardContent>
                                </Card>
                                <Card className="mb-6">
                                    <CardHeader>
                                        <CardTitle className="text-xl flex items-center">
                                            <CheckSquare className="w-5 h-5 mr-2" />
                                            Acceptance Criteria
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="list-disc pl-5 space-y-2">
                                            {(
                                                ticketToDisplay.acceptance_criteria as any
                                            ).criterion.map((criterion: any, index: number) => (
                                                <li key={index}>{criterion}</li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                </Card>
                                <Card className="mb-6">
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center">
                                            <Layers className="w-5 h-5 mr-2" />
                                            Technical Details
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Textarea
                                            className="text-base"
                                            value={ticketToDisplay.technical_details.trim()}
                                            rows={20}
                                            readOnly
                                        />
                                    </CardContent>
                                </Card>
                                <Card className="mb-6">
                                    <CardHeader>
                                        <CardTitle className="text-xl flex items-center">
                                            <ListTodo className="w-5 h-5 mr-2" />
                                            Steps
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ol className="list-decimal pl-5 space-y-2">
                                            {(ticketToDisplay.steps as any).step.map(
                                                (step: any, index: number) => (
                                                    <li key={index}>{step}</li>
                                                )
                                            )}
                                        </ol>
                                    </CardContent>
                                </Card>
                            </div>
                            <div className="md:w-1/3 bg-gray-50 dark:bg-gray-900 p-6 overflow-y-auto border-l">
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                                            Details
                                        </h3>
                                        <div className="space-y-2">
                                            <div className="flex items-center">
                                                <Tag className="w-4 h-4 mr-2" />
                                                <span className="text-sm">Priority: </span>
                                                <Badge
                                                    className={`ml-2 ${
                                                        priorityColors[ticketToDisplay.priority]
                                                    }`}
                                                >
                                                    {ticketToDisplay.priority}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center">
                                                <Layers className="w-4 h-4 mr-2" />
                                                <span className="text-sm">Complexity: </span>
                                                <Badge
                                                    className={`ml-2 ${
                                                        complexityColors[
                                                            ticketToDisplay.estimated_complexity
                                                        ]
                                                    }`}
                                                >
                                                    {ticketToDisplay.estimated_complexity}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center">
                                                <Clock className="w-4 h-4 mr-2" />
                                                <span className="text-sm">
                                                    Effort: {ticketToDisplay.effort}{" "}
                                                    {ticketToDisplay.effortIn}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-lg flex items-center">
                                                <FileCode className="w-5 h-5 mr-2" />
                                                Affected Files
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <ul className="list-disc pl-5 space-y-1 text-sm">
                                                {(ticketToDisplay.affected_files as any).file.map(
                                                    (file: any, index: number) => (
                                                        <li key={index}>{file}</li>
                                                    )
                                                )}
                                            </ul>
                                        </CardContent>
                                    </Card>
                                    {ticketToDisplay.dependencies && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="text-lg flex items-center">
                                                    <GitBranch className="w-5 h-5 mr-2" />
                                                    Dependencies
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-sm">
                                                    {ticketToDisplay.dependencies}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    )}
                                    {ticketToDisplay.risks_and_challenges && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="text-lg flex items-center">
                                                    <AlertTriangle className="w-5 h-5 mr-2" />
                                                    Risks and Challenges
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-sm">
                                                    {ticket.risks_and_challenges}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </DialogContent>
        </Dialog>
    );
};

export default TicketModal;
