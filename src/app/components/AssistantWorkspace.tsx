import React from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const AssistantWorkspace = ({
    assistants,
    assistantStates,
}: {
    assistants: { name: string; icon: any }[];
    assistantStates: { [key: string]: "idle" | "working" | "completed" | "failed" };
}) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Assistant Workspace</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex justify-around mb-6">
                    {assistants.map((assistant) => (
                        <div key={assistant.name} className="text-center space-y-3">
                            <motion.div
                                className={`w-16 h-16 rounded-full flex items-center justify-center ${
                                    assistantStates[assistant.name] === "working"
                                        ? `bg-primary text-primary-foreground`
                                        : assistantStates[assistant.name] === "completed"
                                        ? `bg-primary/20 text-primary`
                                        : assistantStates[assistant.name] === "failed"
                                        ? `bg-destructive/60 text-destructive-foreground`
                                        : "bg-muted text-muted-foreground"
                                } shadow-sm`}
                                animate={
                                    assistantStates[assistant.name] === "working"
                                        ? { scale: [1, 1.1, 1] }
                                        : { scale: 1 }
                                }
                                transition={
                                    assistantStates[assistant.name] === "working"
                                        ? { repeat: Infinity, duration: 2 }
                                        : { duration: 0.3 }
                                }
                            >
                                <assistant.icon className="w-8 h-8" />
                            </motion.div>
                            <p className="text-sm font-medium text-muted-foreground capitalize">
                                {assistant.name}
                            </p>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

export default AssistantWorkspace;
