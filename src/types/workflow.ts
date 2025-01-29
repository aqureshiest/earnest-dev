import { Node, Edge } from "reactflow";

export type NodeType = "ai-agent" | "input" | "output" | "transform" | "condition" | "tool";

export interface WorkflowNode extends Node {
    type: NodeType;
    data: {
        label: string;
        type: NodeType;
        configuration: NodeConfiguration;
    };
}

export interface NodeConfiguration {
    // Common configuration
    id?: string;
    name?: string;
    description?: string;

    // AI Agent specific
    model?: string;
    systemPrompt?: string;
    tools?: string[];
    temperature?: number;
    maxTokens?: number;

    // Input specific
    inputType?: "file" | "form" | "api";
    schema?: Record<string, any>;
    required?: boolean;

    // Output specific
    outputType?: "visualization" | "file" | "api";
    format?: string;
    visualizationConfig?: Record<string, any>;

    // Transform specific
    transformType?: "map" | "filter" | "aggregate";
    transformation?: string | Record<string, any>;

    // Condition specific
    condition?: string;
    truePath?: string;
    falsePath?: string;
}

export interface WorkflowEdge extends Edge {
    data?: {
        transform?: string;
    };
}

export interface Workflow {
    id: string;
    name: string;
    description: string;
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    metadata: {
        createdAt: string;
        updatedAt: string;
        version: string;
    };
}
