// Types for the Executor assistant and tools framework

// Base message types
export interface Message {
    id: string;
    role: "user" | "assistant" | "system" | "tool";
    content: string;
    timestamp: Date;
    metadata?: Record<string, any>;
}

export interface UserMessage extends Message {
    role: "user";
}

export interface AssistantMessage extends Message {
    role: "assistant";
}

export interface SystemMessage extends Message {
    role: "system";
}

export interface ToolMessage extends Message {
    role: "tool";
    toolName: string;
}

export type ChatMessage = UserMessage | AssistantMessage | SystemMessage | ToolMessage;

// Conversation context
export interface Conversation {
    id: string;
    messages: ChatMessage[];
    metadata?: Record<string, any>;
}

// Tool interfaces
export interface ToolRequest {
    conversationId: string;
    requestId: string;
    toolName: string;
    input: string;
    parameters?: Record<string, any>;
}

export interface ToolResponse {
    requestId: string;
    content: string;
    status: "success" | "error" | "in_progress";
    metadata?: Record<string, any>;
}

export interface Tool {
    name: string;
    description: string;
    parameters?: Record<string, any>;
    execute(request: ToolRequest): Promise<ToolResponse>;
}

// Executor assistant interfaces
export interface ExecutorRequest {
    conversationId: string;
    message: string;
    model?: string;
}

// SSE event types
export type EventType =
    | "start"
    | "thinking"
    | "progress"
    | "tool_start"
    | "tool_progress"
    | "tool_end"
    | "complete"
    | "error";

export interface ExecutorEvent {
    type: EventType;
    message: string;
    data?: any;
}

// Registry for tools
export interface ToolRegistry {
    registerTool(tool: Tool): void;
    getTool(name: string): Tool | undefined;
    getAllTools(): Tool[];
    getToolDescriptions(): string;
    unregisterTool(name: string): boolean;
    hasTool(name: string): boolean;
    getToolCount(): number;
    clearTools(): void;
}
