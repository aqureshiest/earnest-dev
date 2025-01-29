import React from "react";
import { Bot, FileInput, FileOutput, GitBranch, Settings2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { NodeType, NodeConfiguration, WorkflowNode } from "@/types/workflow";

interface NodeConfigPanelProps {
    node: WorkflowNode | null;
    onConfigChange: (nodeId: string, config: Partial<NodeConfiguration>) => void;
}

const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({ node, onConfigChange }) => {
    if (!node) {
        return (
            <div className="p-4 text-center text-muted-foreground">
                <Settings2 className="h-8 w-8 mx-auto mb-2" />
                <p>Select a node to configure its properties</p>
            </div>
        );
    }

    const getNodeIcon = (type: NodeType) => {
        switch (type) {
            case "ai-agent":
                return <Bot className="h-5 w-5" />;
            case "input":
                return <FileInput className="h-5 w-5" />;
            case "output":
                return <FileOutput className="h-5 w-5" />;
            case "condition":
                return <GitBranch className="h-5 w-5" />;
            default:
                return <Settings2 className="h-5 w-5" />;
        }
    };

    const handleChange = (key: keyof NodeConfiguration, value: any) => {
        onConfigChange(node.id, { [key]: value });
    };

    const renderAIAgentConfig = () => (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label>Model</Label>
                <Select
                    onValueChange={(value) => handleChange("model", value)}
                    value={node.data.configuration.model}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="gpt-4">GPT-4</SelectItem>
                        <SelectItem value="claude-3">Claude 3</SelectItem>
                        <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label>System Prompt</Label>
                <Textarea
                    placeholder="Enter system prompt..."
                    value={node.data.configuration.systemPrompt || ""}
                    onChange={(e) => handleChange("systemPrompt", e.target.value)}
                    className="h-32"
                />
            </div>

            <div className="space-y-2">
                <Label>Temperature</Label>
                <Input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={node.data.configuration.temperature || 0.7}
                    onChange={(e) => handleChange("temperature", parseFloat(e.target.value))}
                />
            </div>

            <div className="space-y-2">
                <Label>Max Tokens</Label>
                <Input
                    type="number"
                    value={node.data.configuration.maxTokens || 1000}
                    onChange={(e) => handleChange("maxTokens", parseInt(e.target.value))}
                />
            </div>
        </div>
    );

    const renderInputConfig = () => (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label>Input Type</Label>
                <Select
                    onValueChange={(value) => handleChange("inputType", value)}
                    value={node.data.configuration.inputType || "form"}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select input type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="file">File Upload</SelectItem>
                        <SelectItem value="form">Form Input</SelectItem>
                        <SelectItem value="api">API Input</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="flex items-center space-x-2">
                <Switch
                    checked={node.data.configuration.required || false}
                    onCheckedChange={(checked) => handleChange("required", checked)}
                />
                <Label>Required</Label>
            </div>
        </div>
    );

    const renderOutputConfig = () => (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label>Output Type</Label>
                <Select
                    onValueChange={(value) => handleChange("outputType", value)}
                    value={node.data.configuration.outputType || "visualization"}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select output type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="visualization">Visualization</SelectItem>
                        <SelectItem value="file">File Export</SelectItem>
                        <SelectItem value="api">API Response</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );

    const renderNodeConfig = () => {
        switch (node.type) {
            case "ai-agent":
                return renderAIAgentConfig();
            case "input":
                return renderInputConfig();
            case "output":
                return renderOutputConfig();
            default:
                return <div>Configuration not available for this node type.</div>;
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
                {getNodeIcon(node.type)}
                <h3 className="font-semibold">{node.data.label}</h3>
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                        value={node.data.configuration.name || ""}
                        onChange={(e) => handleChange("name", e.target.value)}
                        placeholder="Enter node name..."
                    />
                </div>

                <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                        value={node.data.configuration.description || ""}
                        onChange={(e) => handleChange("description", e.target.value)}
                        placeholder="Enter node description..."
                    />
                </div>
            </div>

            <Card>
                <CardContent className="pt-6">{renderNodeConfig()}</CardContent>
            </Card>
        </div>
    );
};

export default NodeConfigPanel;
