import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    LightbulbIcon,
    FileIcon,
    CheckCircle,
    Clock,
    AlertCircle,
    MessageSquare,
} from "lucide-react";
import ProgressBar from "./ProgressBar";
import Markdown from "react-markdown";

export type StepStatus = "pending" | "active" | "completed" | "error";

interface StepStatusMap {
    [stepTitle: string]: StepStatus;
}

interface StepSummaryMap {
    [stepTitle: string]: string;
}

interface EnhancedImplementationPlanCardProps {
    implementationPlan: AIAssistantResponse<ImplementationPlan> | null;
    stepStatus: StepStatusMap;
    stepSummaries?: StepSummaryMap;
    activeStep: string | null;
    defaultOpenStep?: string | null;
}

const EnhancedImplementationPlanCard: React.FC<EnhancedImplementationPlanCardProps> = ({
    implementationPlan,
    stepStatus,
    stepSummaries = {},
    activeStep,
    defaultOpenStep,
}) => {
    const steps = implementationPlan?.response?.steps || [];

    if (!steps.length) {
        return null;
    }

    // Calculate progress
    const completedSteps = Object.values(stepStatus).filter(
        (status) => status === "completed"
    ).length;
    const totalSteps = steps.length;
    const isGenerating = Object.values(stepStatus).some((status) => status === "active");

    // Get the status icon for a step
    const getStatusIcon = (stepTitle: string) => {
        const status = stepStatus[stepTitle] || "pending";

        switch (status) {
            case "completed":
                return <CheckCircle className="h-5 w-5 text-green-500" />;
            case "active":
                return <Clock className="h-5 w-5 text-amber-500 animate-pulse" />;
            case "error":
                return <AlertCircle className="h-5 w-5 text-red-500" />;
            default:
                return <Clock className="h-5 w-5 text-muted-foreground" />;
        }
    };

    // Get the status badge for a step
    const getStatusBadge = (stepTitle: string) => {
        const status = stepStatus[stepTitle] || "pending";

        switch (status) {
            case "completed":
                return <Badge variant="default">Completed</Badge>;
            case "active":
                return (
                    <Badge variant="secondary" className="animate-pulse">
                        In Progress
                    </Badge>
                );
            case "error":
                return <Badge variant="destructive">Error</Badge>;
            default:
                return <Badge variant="secondary">Pending</Badge>;
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center space-x-2">
                        <CardTitle>Implementation Plan</CardTitle>
                        <Badge variant="outline">
                            {completedSteps}/{totalSteps} Steps
                        </Badge>
                    </div>
                    {implementationPlan && (
                        <div className="text-xs text-muted-foreground">
                            <div>Cost: ${implementationPlan.cost.toFixed(6)}</div>
                            <div>Input Tokens: {implementationPlan.inputTokens}</div>
                            <div>Output Tokens: {implementationPlan.outputTokens}</div>
                        </div>
                    )}
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <ProgressBar
                            currentStep={completedSteps}
                            totalSteps={totalSteps}
                            isActive={isGenerating}
                        />
                    </div>

                    <Accordion
                        type="single"
                        collapsible
                        className="w-full"
                        defaultValue={defaultOpenStep || undefined}
                    >
                        {steps.map((step, index) => {
                            const isActive = step.title === activeStep;
                            const status = stepStatus[step.title] || "pending";
                            const hasSummary = stepSummaries[step.title] && status === "completed";

                            // const stepClassName = `${
                            //     isActive ? "border-l-4 border-primary pl-2" : ""
                            // }`;

                            return (
                                <AccordionItem
                                    key={index}
                                    value={step.title}
                                    // className={stepClassName}
                                >
                                    <AccordionTrigger className="hover:no-underline">
                                        <div className="flex items-center justify-between w-full pr-4">
                                            <div className="flex items-center space-x-2">
                                                {getStatusIcon(step.title)}
                                                <span>{step.title}</span>
                                            </div>
                                            <div className="flex-shrink-0">
                                                {getStatusBadge(step.title)}
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="space-y-4">
                                        {/* Step Summary (when completed) */}
                                        {hasSummary && (
                                            <div className="bg-secondary/20 rounded-md p-3 border-l-4 border-green-500">
                                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                                    <Markdown>{stepSummaries[step.title]}</Markdown>
                                                </div>
                                            </div>
                                        )}

                                        {/* Original content */}
                                        <div className="space-y-2">
                                            <Label className="flex items-center text-sm font-medium">
                                                <LightbulbIcon className="mr-2 h-4 w-4" />
                                                Thoughts
                                            </Label>
                                            <Textarea
                                                value={step.thoughts}
                                                readOnly
                                                className="min-h-[80px] resize-none"
                                            />
                                        </div>
                                        <div className="space-y-4">
                                            {step.files.map((file, fileIndex) => (
                                                <div key={fileIndex} className="space-y-2">
                                                    <Label className="flex items-center text-sm font-medium">
                                                        <FileIcon className="mr-2 h-4 w-4" />
                                                        {file.path}
                                                        <Badge variant="secondary" className="ml-2">
                                                            {file.operation}
                                                        </Badge>
                                                    </Label>
                                                    <Textarea
                                                        value={file.todos.join("\n")}
                                                        readOnly
                                                        className="min-h-[120px] resize-none"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            );
                        })}
                    </Accordion>
                </CardContent>
            </Card>
        </motion.div>
    );
};

export default EnhancedImplementationPlanCard;
