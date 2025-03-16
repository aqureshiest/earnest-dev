import { v4 as uuidv4 } from "uuid";

import {
    Conversation,
    ToolRegistry,
    ExecutorEvent,
    ExecutorRequest,
    ToolRequest,
    ToolResponse,
    ChatMessage,
} from "@/types/executor";
import { ExecutorAssistant } from "./ExecutorAssistant";

export class ExecutorService {
    private conversations: Map<string, Conversation> = new Map();
    private toolRegistry: ToolRegistry;
    private executor: ExecutorAssistant;
    private eventListeners: Map<string, (event: ExecutorEvent) => void> = new Map();

    constructor(toolRegistry: ToolRegistry, executor: ExecutorAssistant) {
        this.toolRegistry = toolRegistry;
        this.executor = executor;
    }

    public async processRequest(
        request: ExecutorRequest,
        onEvent: (event: ExecutorEvent) => void
    ): Promise<void> {
        const { conversationId, message, model } = request;

        // Register event listener for this conversation
        this.eventListeners.set(conversationId, onEvent);

        try {
            // Send start event
            this.sendEvent(conversationId, {
                type: "start",
                message: "Processing your request...",
            });

            // Get or create conversation
            let conversation = this.getOrCreateConversation(conversationId);

            // Add user message to conversation
            const userMessage: ChatMessage = {
                id: uuidv4(),
                role: "user",
                content: message,
                timestamp: new Date(),
            };
            conversation.messages.push(userMessage);

            // Send thinking event
            this.sendEvent(conversationId, {
                type: "thinking",
                message: "Thinking...",
            });

            // Process the request with the executor assistant
            const response = await this.executor.processRequest({
                conversation,
                model: model || "default",
                tools: this.toolRegistry.getAllTools(),
                toolDescriptions: this.toolRegistry.getToolDescriptions(),
                onEvent: (event) => this.sendEvent(conversationId, event),
            });

            // Add assistant response to conversation
            const assistantMessage: ChatMessage = {
                id: uuidv4(),
                role: "assistant",
                content: response,
                timestamp: new Date(),
            };
            conversation.messages.push(assistantMessage);

            // Send complete event
            this.sendEvent(conversationId, {
                type: "complete",
                message: response,
            });
        } catch (error) {
            console.error("Error processing request:", error);
            this.sendEvent(conversationId, {
                type: "error",
                message: `Error processing request: ${
                    error instanceof Error ? error.message : String(error)
                }`,
            });
        } finally {
            // Clean up event listener
            this.eventListeners.delete(conversationId);
        }
    }

    public async executeTool(toolRequest: ToolRequest): Promise<ToolResponse> {
        const { toolName, conversationId } = toolRequest;

        try {
            // Send tool start event
            this.sendEvent(conversationId, {
                type: "tool_start",
                message: `Starting tool: ${toolName}`,
                data: { toolName },
            });

            // Get the tool from registry
            const tool = this.toolRegistry.getTool(toolName);
            if (!tool) {
                throw new Error(`Tool not found: ${toolName}`);
            }

            // Execute the tool
            const response = await tool.execute(toolRequest);

            // Add tool message to conversation
            const conversation = this.getOrCreateConversation(conversationId);
            const toolMessage: ChatMessage = {
                id: uuidv4(),
                role: "tool",
                toolName,
                content: response.content,
                timestamp: new Date(),
                metadata: response.metadata,
            };
            conversation.messages.push(toolMessage);

            // Send tool end event
            this.sendEvent(conversationId, {
                type: "tool_end",
                message: `Tool ${toolName} completed`,
                data: { toolName, response },
            });

            return response;
        } catch (error) {
            console.error(`Error executing tool ${toolName}:`, error);
            this.sendEvent(conversationId, {
                type: "error",
                message: `Error executing tool ${toolName}: ${
                    error instanceof Error ? error.message : String(error)
                }`,
                data: { toolName },
            });

            return {
                requestId: toolRequest.requestId,
                content: `Error executing tool: ${
                    error instanceof Error ? error.message : String(error)
                }`,
                status: "error",
            };
        }
    }

    private getOrCreateConversation(conversationId: string): Conversation {
        let conversation = this.conversations.get(conversationId);

        if (!conversation) {
            conversation = {
                id: conversationId,
                messages: [
                    {
                        id: uuidv4(),
                        role: "system",
                        content: this.getSystemPrompt(),
                        timestamp: new Date(),
                    },
                ],
            };
            this.conversations.set(conversationId, conversation);
        }

        return conversation;
    }

    private getSystemPrompt(): string {
        return `You are Executor, an AI assistant that can use tools to help users accomplish their tasks. 
You have access to various tools that can help you fulfill user requests.
When you need to use a tool, you should clearly indicate which tool you want to use and what inputs you are providing.`;
    }

    private sendEvent(conversationId: string, event: ExecutorEvent): void {
        const listener = this.eventListeners.get(conversationId);
        if (listener) {
            listener(event);
        }
    }
}
