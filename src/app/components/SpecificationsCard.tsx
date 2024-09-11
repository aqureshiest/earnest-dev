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
import { LightbulbIcon, ClipboardList } from "lucide-react";

const SpecificationsCard = ({
    specifications,
}: {
    specifications: AIAssistantResponse<Specifications> | null;
}) => {
    const specs = (specifications?.response || []) as Specification[];

    if (!specs.length) {
        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle>Specifications</CardTitle>
                    {specifications && (
                        <div className="text-xs text-muted-foreground">
                            <div>Cost: ${specifications.cost.toFixed(6)}</div>
                            <div>Input Tokens: {specifications.inputTokens}</div>
                            <div>Output Tokens: {specifications.outputTokens}</div>
                        </div>
                    )}
                </CardHeader>
                <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                        {specs.map((spec, index) => (
                            <AccordionItem key={index} value={`item-${index}`}>
                                <AccordionTrigger className="hover:no-underline">
                                    <span>{spec.title}</span>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="flex items-center text-sm font-medium">
                                            <LightbulbIcon className="mr-2 h-4 w-4" />
                                            Thoughts
                                        </Label>
                                        <Textarea
                                            value={spec.summary}
                                            readOnly
                                            className="min-h-[80px] resize-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="flex items-center text-sm font-medium">
                                            <ClipboardList className="mr-2 h-4 w-4" />
                                            Specification
                                        </Label>
                                        <Textarea
                                            value={spec.key_steps.join("\n")}
                                            readOnly
                                            className="min-h-[120px] resize-none"
                                        />
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

export default SpecificationsCard;
