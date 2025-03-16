import { LLM_MODELS } from "@/modules/utils/llmInfo";
import { Conversation, ExecutorEvent, Tool, ToolRequest } from "@/types/executor";
import { v4 as uuidv4 } from "uuid";
import { ClaudeAIService } from "../clients/ClaudeAIService";

interface ExecutorAssistantRequest {
    conversation: Conversation;
    model: string;
    tools: Tool[];
    toolDescriptions: string;
    onEvent: (event: ExecutorEvent) => void;
}

export class ExecutorAssistant {
    private aiService: ClaudeAIService;

    constructor() {
        // Default to a model that supports tool use
        this.aiService = new ClaudeAIService(LLM_MODELS.ANTHROPIC_CLAUDE_3_7_SONNET.id);
    }

    public async processRequest(request: ExecutorAssistantRequest): Promise<string> {
        const { conversation, tools, toolDescriptions, onEvent, model } = request;

        // If a different model is specified, create a new instance of the AI service
        const aiService =
            model === LLM_MODELS.ANTHROPIC_CLAUDE_3_7_SONNET.id
                ? this.aiService
                : new ClaudeAIService(model);

        // Prepare the system prompt with tool descriptions
        const systemPrompt = this.buildSystemPrompt(toolDescriptions);

        // Prepare the user prompt with conversation history
        const userPrompt = this.buildUserPrompt(conversation);

        // Process the request with the AI service
        onEvent({
            type: "progress",
            message: "Generating response...",
        });

        const aiResponse = await aiService.generateResponse(systemPrompt, userPrompt);

        console.log(`AI Response: ${aiResponse.response}\n\n`); // Debug log for AI response

        // Extract and process any tool usages from the response
        const result = await this.processResponseForToolUsage(
            aiResponse.response,
            conversation.id,
            tools,
            onEvent
        );

        console.log(`Final Result: ${result}\n\n`); // Debug log for final result

        return result;
    }

    private buildSystemPrompt(toolDescriptions: string): string {
        return `You are Executor, an AI assistant that helps users accomplish their tasks.
You have access to tools that you can use to fulfill user requests.

<tools>
${toolDescriptions}
</tools>

When you need to use a tool, indicate this with the following format:
<tool name="tool_name">
input or query to the tool
</tool>

For example, to search the web, you would write:
<tool name="search">
What is the capital of France?
</tool>

Wait for tool results before providing your final answer to the user.
When a tool gives results, you should analyze them and incorporate them into your response as appropriate.

Always be helpful, concise, and accurate. If you don't know the answer, say so. If you need to use a tool to answer a question, use the appropriate tool.
Do not pretend to be a human. You are an AI assistant with tool capabilities.`;
    }

    private buildUserPrompt(conversation: Conversation): string {
        // Convert conversation history to a format suitable for the AI
        let prompt = "";

        conversation.messages.forEach((message) => {
            switch (message.role) {
                case "user":
                    prompt += `User: ${message.content}\n\n`;
                    break;
                case "assistant":
                    prompt += `Assistant: ${message.content}\n\n`;
                    break;
                case "tool":
                    prompt += `Tool (${message.toolName}): ${message.content}\n\n`;
                    break;
                // Skip system messages in the user prompt
            }
        });

        return prompt.trim();
    }

    private async processResponseForToolUsage(
        response: string,
        conversationId: string,
        tools: Tool[],
        onEvent: (event: ExecutorEvent) => void
    ): Promise<string> {
        let processedResponse = response;

        // Extract tool usage patterns
        const toolPattern = /<tool name="([^"]+)">([\s\S]*?)<\/tool>/g;
        let match;
        let toolExecutions = [];

        while ((match = toolPattern.exec(response)) !== null) {
            const toolName = match[1];
            const toolInput = match[2].trim();
            const fullMatch = match[0];

            // Find the tool
            const tool = tools.find((t) => t.name === toolName);

            if (tool) {
                // Create tool request
                const toolRequest: ToolRequest = {
                    conversationId,
                    requestId: uuidv4(),
                    toolName,
                    input: toolInput,
                };

                // Add to the list of tools to execute
                toolExecutions.push({
                    request: toolRequest,
                    tool,
                    fullMatch,
                });
            }
        }

        // Execute all tools in sequence
        for (const execution of toolExecutions) {
            const { request, tool, fullMatch } = execution;

            onEvent({
                type: "tool_progress",
                message: `Using tool: ${tool.name}`,
                data: { toolName: tool.name, input: request.input },
            });

            try {
                // Execute the tool
                const toolResponse = await tool.execute(request);

                console.log(`\n\nTool ${tool.name} response:`, toolResponse); // Debug log for tool response

                // Replace the tool usage with the result in the processed response
                const replacementText = `<tool-result name="${tool.name}">
${toolResponse.content}
</tool-result>`;

                processedResponse = processedResponse.replace(fullMatch, replacementText);

                onEvent({
                    type: "tool_progress",
                    message: `Tool ${tool.name} returned result`,
                    data: { toolName: tool.name, result: toolResponse.content },
                });
            } catch (error) {
                console.error(`Error executing tool ${tool.name}:`, error);

                // Replace the tool usage with an error message
                const errorMessage = `<tool-error name="${tool.name}">
Error: ${error instanceof Error ? error.message : String(error)}
</tool-error>`;

                processedResponse = processedResponse.replace(fullMatch, errorMessage);

                onEvent({
                    type: "error",
                    message: `Error using tool ${tool.name}: ${
                        error instanceof Error ? error.message : String(error)
                    }`,
                    data: { toolName: tool.name },
                });
            }
        }

        // If we executed any tools, perform a second pass with the AI to incorporate the results
        if (toolExecutions.length > 0) {
            onEvent({
                type: "progress",
                message: "Processing tool results...",
            });

            const systemPrompt = `You are Executor, an AI assistant that helps users accomplish their tasks.
You used some tools and received results. Now, provide a coherent and helpful response that incorporates the tool results.
Remove all <tool-result> and <tool-error> tags in your final response to the user.`;

            const aiResponse = await this.aiService.generateResponse(
                systemPrompt,
                processedResponse
            );

            // Clean up any remaining tool tags
            return this.cleanupToolTags(aiResponse.response);
        }

        // Clean up any tool tags that might have been in the response
        return this.cleanupToolTags(processedResponse);
    }

    private cleanupToolTags(response: string): string {
        // Remove all tool-related tags
        return response
            .replace(/<tool name="[^"]+">[\s\S]*?<\/tool>/g, "")
            .replace(/<tool-result name="[^"]+">[\s\S]*?<\/tool-result>/g, "")
            .replace(/<tool-error name="[^"]+">[\s\S]*?<\/tool-error>/g, "")
            .trim();
    }
}
