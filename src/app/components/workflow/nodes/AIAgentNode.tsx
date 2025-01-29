import React, { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const AIAgentNode = ({ data, isConnectable }: NodeProps) => {
    return (
        <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-primary">
            <Handle
                type="target"
                position={Position.Top}
                isConnectable={isConnectable}
                className="w-3 h-3 bg-primary"
            />

            <div className="flex items-center">
                <Bot className="h-8 w-8 text-primary mr-2" />
                <div>
                    <div className="font-bold text-sm">{data.label}</div>
                    <div className="text-xs text-muted-foreground">
                        {data.configuration.model || "No model selected"}
                    </div>
                </div>
            </div>

            {/* Tools Section */}
            {data.configuration.tools?.length > 0 && (
                <div className="mt-2">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        {/* <Tool className="h-3 w-3" /> */}
                        <span>Tools:</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                        {data.configuration.tools.map((tool: string, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs">
                                {tool}
                            </Badge>
                        ))}
                    </div>
                </div>
            )}

            <Handle
                type="source"
                position={Position.Bottom}
                isConnectable={isConnectable}
                className="w-3 h-3 bg-primary"
            />
        </div>
    );
};

export default memo(AIAgentNode);
