import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, ArrowRight, ArrowLeft, SkipForward } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Common interfaces
interface Choice {
    id: string;
    text: string;
}

interface Question {
    id: string;
    question: string;
    type: "single" | "multiple";
    choices: Choice[];
    answer: string[];
}

interface QuestionSection {
    id: string;
    title: string;
    description?: string;
    questions: Question[];
}

interface ClarifyingQuestionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    sections: QuestionSection[];
    onComplete: (responses: QuestionSection[]) => void;
    isLoading?: boolean;
    completeButtonText?: string;
    allowSkip?: boolean;
    showSectionNavigation?: boolean;
    modalTitle?: string;
    modalDescription?: string;
}

const ClarifyingQuestionsModal: React.FC<ClarifyingQuestionsModalProps> = ({
    isOpen,
    onClose,
    sections,
    onComplete,
    isLoading = false,
    completeButtonText = "Complete",
    allowSkip = false,
    showSectionNavigation = true,
    modalTitle,
    modalDescription,
}) => {
    const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
    const [responses, setResponses] = useState<QuestionSection[]>([]);
    const [skippedSections, setSkippedSections] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (isOpen && sections.length > 0) {
            setCurrentSectionIndex(0);
            setResponses(sections);
            setSkippedSections(new Set());
        }
    }, [sections, isOpen]);

    const currentSection = responses[currentSectionIndex];
    const isLastSection = currentSectionIndex === responses.length - 1;
    const isFirstSection = currentSectionIndex === 0;

    const handleSingleChoiceChange = (questionId: string, choiceId: string) => {
        setResponses((prev) =>
            prev.map((section) =>
                section.id === currentSection.id
                    ? {
                          ...section,
                          questions: section.questions.map((q) =>
                              q.id === questionId ? { ...q, answer: [choiceId] } : q
                          ),
                      }
                    : section
            )
        );
    };

    const handleMultipleChoiceChange = (questionId: string, choiceId: string, checked: boolean) => {
        setResponses((prev) =>
            prev.map((section) =>
                section.id === currentSection.id
                    ? {
                          ...section,
                          questions: section.questions.map((q) =>
                              q.id === questionId
                                  ? {
                                        ...q,
                                        answer: checked
                                            ? [...q.answer, choiceId]
                                            : q.answer.filter((id) => id !== choiceId),
                                    }
                                  : q
                          ),
                      }
                    : section
            )
        );
    };

    const handleNext = () => {
        if (isLastSection) {
            onComplete(responses);
        } else {
            setCurrentSectionIndex((prev) => prev + 1);
        }
    };

    const handlePrevious = () => {
        setCurrentSectionIndex((prev) => prev - 1);
    };

    const handleSkipSection = () => {
        setSkippedSections((prev) => {
            const newSkipped = new Set(prev);
            newSkipped.add(currentSection.id);
            return newSkipped;
        });
        if (isLastSection) {
            onComplete(responses);
        } else {
            setCurrentSectionIndex((prev) => prev + 1);
        }
    };

    const getProgressPercentage = () => {
        if (!currentSection) return 0;
        const answeredCount = currentSection.questions.filter((q) => q.answer.length > 0).length;
        return (answeredCount / currentSection.questions.length) * 100;
    };

    const getTotalProgressPercentage = () => {
        if (!responses.length) return 0;

        let totalQuestions = 0;
        let answeredQuestions = 0;

        responses.forEach((section) => {
            section.questions.forEach((question) => {
                totalQuestions++;
                if (question.answer.length > 0) {
                    answeredQuestions++;
                }
            });
        });

        return (answeredQuestions / totalQuestions) * 100;
    };

    if (!currentSection) {
        return null;
    }

    const isSkipped = skippedSections.has(currentSection.id);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[85vh] p-0 gap-0 flex flex-col overflow-hidden">
                {/* Sticky Header */}
                <div className="sticky top-0 bg-background border-b z-10">
                    <DialogHeader className="p-6 pb-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <DialogTitle className="text-2xl font-semibold">
                                    {modalTitle || currentSection.title}
                                </DialogTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {modalDescription ||
                                        currentSection.description ||
                                        "Please answer the following questions"}
                                </p>
                            </div>
                            {showSectionNavigation && (
                                <Badge
                                    variant={isSkipped ? "destructive" : "secondary"}
                                    className="h-7 px-3"
                                >
                                    {isSkipped
                                        ? "Skipped"
                                        : `${currentSectionIndex + 1} of ${responses.length}`}
                                </Badge>
                            )}
                        </div>
                        <div className="mt-4">
                            <Progress
                                value={
                                    showSectionNavigation
                                        ? getProgressPercentage()
                                        : getTotalProgressPercentage()
                                }
                                className="h-2"
                            />
                        </div>
                    </DialogHeader>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto">
                    <div className="px-6 py-4">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentSection.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-6"
                            >
                                {currentSection.questions.map((question, idx) => (
                                    <Card
                                        key={question.id}
                                        className={cn(
                                            "transition-all duration-200",
                                            question.answer.length > 0 && "border-primary/50",
                                            "hover:shadow-md"
                                        )}
                                    >
                                        <CardContent className="p-6">
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium">
                                                        {idx + 1}
                                                    </span>
                                                    <Label className="text-base font-medium">
                                                        {question.question}
                                                        <span className="ml-2 text-xs text-muted-foreground">
                                                            (
                                                            {question.type === "single"
                                                                ? "Select one"
                                                                : "Select all that apply"}
                                                            )
                                                        </span>
                                                    </Label>
                                                </div>

                                                {question.type === "single" ? (
                                                    <div className="grid grid-cols-1 gap-3 ml-9">
                                                        {question.choices.map((choice) => {
                                                            const isSelected =
                                                                question.answer[0] === choice.id;
                                                            return (
                                                                <button
                                                                    key={choice.id}
                                                                    onClick={() =>
                                                                        handleSingleChoiceChange(
                                                                            question.id,
                                                                            choice.id
                                                                        )
                                                                    }
                                                                    className={cn(
                                                                        "relative p-4 cursor-pointer rounded-lg text-left",
                                                                        "border-2 transition-all duration-200",
                                                                        "hover:border-primary/50 hover:bg-accent/50",
                                                                        isSelected
                                                                            ? "border-primary bg-primary/5 shadow-sm"
                                                                            : "border-muted bg-background"
                                                                    )}
                                                                >
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-sm font-medium">
                                                                            {choice.text}
                                                                        </span>
                                                                        {isSelected && (
                                                                            <motion.div
                                                                                initial={{
                                                                                    scale: 0,
                                                                                }}
                                                                                animate={{
                                                                                    scale: 1,
                                                                                }}
                                                                                className="h-6 w-6 rounded-full bg-primary flex items-center justify-center"
                                                                            >
                                                                                <svg
                                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                                    className="h-4 w-4 text-primary-foreground"
                                                                                    viewBox="0 0 20 20"
                                                                                    fill="currentColor"
                                                                                >
                                                                                    <path
                                                                                        fillRule="evenodd"
                                                                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                                                        clipRule="evenodd"
                                                                                    />
                                                                                </svg>
                                                                            </motion.div>
                                                                        )}
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-1 gap-3 ml-9">
                                                        {question.choices.map((choice) => {
                                                            const isSelected =
                                                                question.answer.includes(choice.id);
                                                            return (
                                                                <button
                                                                    key={choice.id}
                                                                    onClick={() =>
                                                                        handleMultipleChoiceChange(
                                                                            question.id,
                                                                            choice.id,
                                                                            !isSelected
                                                                        )
                                                                    }
                                                                    className={cn(
                                                                        "relative p-4 cursor-pointer rounded-lg text-left",
                                                                        "border-2 transition-all duration-200",
                                                                        "hover:border-primary/50 hover:bg-accent/50",
                                                                        isSelected
                                                                            ? "border-primary bg-primary/5 shadow-sm"
                                                                            : "border-muted bg-background"
                                                                    )}
                                                                >
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-sm font-medium">
                                                                            {choice.text}
                                                                        </span>
                                                                        {isSelected && (
                                                                            <motion.div
                                                                                initial={{
                                                                                    scale: 0,
                                                                                }}
                                                                                animate={{
                                                                                    scale: 1,
                                                                                }}
                                                                                className="h-6 w-6 rounded-md bg-primary flex items-center justify-center"
                                                                            >
                                                                                <svg
                                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                                    className="h-4 w-4 text-primary-foreground"
                                                                                    viewBox="0 0 20 20"
                                                                                    fill="currentColor"
                                                                                >
                                                                                    <path
                                                                                        fillRule="evenodd"
                                                                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                                                        clipRule="evenodd"
                                                                                    />
                                                                                </svg>
                                                                            </motion.div>
                                                                        )}
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                {/* Sticky Footer */}
                <div className="sticky bottom-0 bg-background border-t z-10">
                    <div className="p-6 flex items-center justify-between">
                        <div className="flex-1">
                            {showSectionNavigation && !isFirstSection && (
                                <Button
                                    variant="ghost"
                                    onClick={handlePrevious}
                                    disabled={isLoading}
                                >
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Previous
                                </Button>
                            )}
                        </div>

                        <div className="flex gap-3">
                            {allowSkip && (
                                <Button
                                    variant="outline"
                                    onClick={handleSkipSection}
                                    disabled={isLoading}
                                >
                                    <SkipForward className="w-4 h-4 mr-2" />
                                    Skip
                                </Button>
                            )}
                            <Button onClick={handleNext} disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        {isLastSection ? (
                                            completeButtonText
                                        ) : (
                                            <>
                                                Next
                                                <ArrowRight className="w-4 h-4 ml-2" />
                                            </>
                                        )}
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ClarifyingQuestionsModal;
