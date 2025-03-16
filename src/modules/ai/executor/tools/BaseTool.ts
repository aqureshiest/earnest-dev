import { Tool, ToolRequest, ToolResponse } from "@/types/executor";

/**
 * Abstract base class for all tools to implement common functionality
 */
export abstract class BaseTool implements Tool {
    public abstract name: string;
    public abstract description: string;
    public parameters?: Record<string, any>;

    /**
     * Execute the tool with the given request
     */
    public async execute(request: ToolRequest): Promise<ToolResponse> {
        try {
            // Log tool execution start
            console.log(`Executing tool: ${this.name}`, {
                requestId: request.requestId,
                conversationId: request.conversationId,
            });

            // Track execution time
            const startTime = Date.now();

            // Execute the tool implementation
            const response = await this.executeImpl(request);

            // Calculate execution time
            const executionTime = Date.now() - startTime;

            // Enhance response with metadata
            const enhancedResponse: ToolResponse = {
                ...response,
                metadata: {
                    ...response.metadata,
                    executionTime,
                },
            };

            // Log tool execution end
            console.log(`Tool execution completed: ${this.name}`, {
                requestId: request.requestId,
                executionTime,
                status: enhancedResponse.status,
            });

            return enhancedResponse;
        } catch (error) {
            // Log tool execution error
            console.error(`Tool execution error: ${this.name}`, {
                requestId: request.requestId,
                error: error instanceof Error ? error.message : String(error),
            });

            // Return error response
            return {
                requestId: request.requestId,
                content: `Error executing tool ${this.name}: ${
                    error instanceof Error ? error.message : String(error)
                }`,
                status: "error",
            };
        }
    }

    /**
     * Implement this method in derived tool classes
     */
    protected abstract executeImpl(request: ToolRequest): Promise<ToolResponse>;
}
