import React from "react";
import { Card } from "@/components/ui/card";
import { CheckCircle, Circle } from "lucide-react";
import { ExtensionConfig } from "@/types/extension";

const ExtensionConfigProgress = ({
    config,
    conversationComplete,
}: {
    config: Partial<ExtensionConfig> | null;
    conversationComplete: boolean;
}) => {
    const steps = [
        {
            title: "Purpose",
            description: "Extension name and description",
            complete: Boolean(config?.name && config?.description),
        },
        {
            title: "Input Required",
            description: "Input configuration",
            complete: Boolean(config?.userInput?.required !== undefined),
        },
        {
            title: "Context",
            description: "File selection scope",
            complete: Boolean(config?.userInput?.useRelevantFiles !== undefined),
        },
        {
            title: "Output Format",
            description: "Data structure",
            complete: Boolean(config?.outputSchema),
        },
        {
            title: "Views",
            description: "Output visualization",
            complete: Boolean(config?.uiConfig?.outputViews?.length ?? 0 > 0),
        },
    ];

    const finalStep = {
        title: "Complete",
        description: "Configuration ready",
        complete: conversationComplete,
    };

    return (
        <Card className="w-full p-4 mb-6">
            <div className="flex justify-between items-center">
                {[...steps, finalStep].map((step, index) => (
                    <div key={index} className="flex flex-col items-center relative w-full">
                        {index < steps.length && (
                            <div
                                className={`absolute w-full h-0.5 top-3 left-1/2 -z-10 
                ${step.complete ? "bg-primary" : "bg-muted"}`}
                            />
                        )}

                        <div className="bg-background p-1">
                            {step.complete ? (
                                <CheckCircle className="w-5 h-5 text-primary" />
                            ) : (
                                <Circle className="w-5 h-5 text-muted-foreground" />
                            )}
                        </div>

                        <div className="text-center w-full">
                            <div className="font-medium text-xs truncate px-1">{step.title}</div>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
};

export default ExtensionConfigProgress;
