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
import { LightbulbIcon, FileIcon } from "lucide-react";

const ImplementationPlanCard = ({
    implementationPlan,
}: {
    implementationPlan: AIAssistantResponse<ImplementationPlan> | null;
}) => {
    const steps = implementationPlan?.response?.steps || [];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle>Implementation Plan</CardTitle>
                    {implementationPlan && (
                        <div className="text-xs text-muted-foreground">
                            <div>Cost: ${implementationPlan.cost.toFixed(6)}</div>
                            <div>Input Tokens: {implementationPlan.inputTokens}</div>
                            <div>Output Tokens: {implementationPlan.outputTokens}</div>
                        </div>
                    )}
                </CardHeader>
                <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                        {steps.map((step, index) => (
                            <AccordionItem key={index} value={`item-${index}`}>
                                <AccordionTrigger className="hover:no-underline">
                                    <span>{step.title}</span>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-4">
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
                        ))}
                    </Accordion>
                </CardContent>
            </Card>
        </motion.div>
    );
};

export default ImplementationPlanCard;
