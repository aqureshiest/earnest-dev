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
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FeatureQuestions } from "@/types/prd";
import { cn } from "@/lib/utils";

interface FeatureQuestionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    features: FeatureQuestions[];
    onComplete: (responses: FeatureQuestions[]) => void;
    isLoading?: boolean;
}

const FeatureQuestionsModal: React.FC<FeatureQuestionsModalProps> = ({
    isOpen,
    onClose,
    features,
    onComplete,
    isLoading = false,
}) => {
    const [currentFeatureIndex, setCurrentFeatureIndex] = useState(0);
    const [responses, setResponses] = useState<FeatureQuestions[]>([]);
    const [skippedFeatures, setSkippedFeatures] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (isOpen && features.length > 0) {
            setCurrentFeatureIndex(0);
            setResponses(features);
            setSkippedFeatures(new Set());
        }
    }, [features, isOpen]);

    const currentFeature = responses[currentFeatureIndex];
    const isLastFeature = currentFeatureIndex === responses.length - 1;
    const isFirstFeature = currentFeatureIndex === 0;

    const handleSingleChoiceChange = (questionId: string, choiceId: string) => {
        setResponses((prev) =>
            prev.map((feature) =>
                feature.featureId === currentFeature.featureId
                    ? {
                          ...feature,
                          questions: feature.questions.map((q) =>
                              q.id === questionId ? { ...q, answer: [choiceId] } : q
                          ),
                      }
                    : feature
            )
        );
    };

    const handleMultipleChoiceChange = (questionId: string, choiceId: string, checked: boolean) => {
        setResponses((prev) =>
            prev.map((feature) =>
                feature.featureId === currentFeature.featureId
                    ? {
                          ...feature,
                          questions: feature.questions.map((q) =>
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
                    : feature
            )
        );
    };

    const handleNext = () => {
        if (isLastFeature) {
            onComplete(responses);
        } else {
            setCurrentFeatureIndex((prev) => prev + 1);
        }
    };

    const handlePrevious = () => {
        setCurrentFeatureIndex((prev) => prev - 1);
    };

    const handleSkipFeature = () => {
        setSkippedFeatures((prev) => {
            const newSkipped = new Set(prev);
            newSkipped.add(currentFeature.featureId);
            return newSkipped;
        });
        if (isLastFeature) {
            onComplete(responses);
        } else {
            setCurrentFeatureIndex((prev) => prev + 1);
        }
    };

    const getProgressPercentage = () => {
        if (!currentFeature) return 0;
        const answeredCount = currentFeature.questions.filter((q) => q.answer.length > 0).length;
        return (answeredCount / currentFeature.questions.length) * 100;
    };

    if (!currentFeature) {
        return null;
    }

    const isSkipped = skippedFeatures.has(currentFeature.featureId);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[85vh] p-0 gap-0 flex flex-col overflow-hidden">
                {/* Sticky Header */}
                <div className="sticky top-0 bg-background border-b z-10">
                    <DialogHeader className="p-6 pb-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <DialogTitle className="text-2xl font-semibold">
                                    {currentFeature.featureName}
                                </DialogTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Help us understand your requirements better
                                </p>
                            </div>
                            <Badge
                                variant={isSkipped ? "destructive" : "secondary"}
                                className="h-7 px-3"
                            >
                                {isSkipped
                                    ? "Skipped"
                                    : `${currentFeatureIndex + 1} of ${responses.length}`}
                            </Badge>
                        </div>
                        <div className="mt-4">
                            <Progress value={getProgressPercentage()} className="h-2" />
                        </div>
                    </DialogHeader>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto">
                    <div className="px-6 py-4">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentFeature.featureId}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-6"
                            >
                                {currentFeature.questions.map((question, idx) => (
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
                            {!isFirstFeature && (
                                <Button
                                    variant="ghost"
                                    onClick={handlePrevious}
                                    disabled={isLoading}
                                >
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Previous Feature
                                </Button>
                            )}
                        </div>

                        <div className="flex gap-3">
                            {/* <Button
                                variant="outline"
                                onClick={handleSkipFeature}
                                disabled={isLoading}
                            >
                                <SkipForward className="w-4 h-4 mr-2" />
                                Skip Feature
                            </Button> */}
                            <Button onClick={handleNext} disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        {isLastFeature ? (
                                            "Complete"
                                        ) : (
                                            <>
                                                Next Feature
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

export default FeatureQuestionsModal;
