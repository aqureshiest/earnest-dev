import { saveRunInfo } from "@/modules/utilities/saveRunInfo";
import { LLM_MODELS } from "../../utilities/llmInfo";
import { ClaudeAIService } from "../clients/ClaudeAIService";
import { OpenAIService } from "../clients/OpenAIService";
import { TokenLimiter } from "../support/TokenLimiter";
import { PromptBuilder } from "../support/PromptBuilder";

abstract class BaseAssistant<T> implements AIAssistant<T> {
    constructor(private promptBuilder: PromptBuilder, private tokenLimiter: TokenLimiter) {}

    abstract getSystemPrompt(): string;
    abstract getPrompt(params?: any): string;

    async process(request: AIAssistantRequest): Promise<AIAssistantResponse<T> | null> {
        const { model, task, files, params } = request;
        console.log(
            `[${this.constructor.name}] Processing task:\n>>${task}\n>>with model: ${model}`
        );

        const systemPrompt = this.getSystemPrompt();
        const basePrompt = this.getPrompt();

        const userParams = {
            ...params,
            taskDescription: task,
        };

        // Build the user prompt first
        const userPrompt = this.promptBuilder.buildUserPrompt(basePrompt, userParams);

        // Apply token limit to system prompt + user prompt, and get allowed files
        const { totalTokens, allowedFiles } = this.tokenLimiter.applyTokenLimit(
            model,
            systemPrompt + userPrompt,
            files
        );

        // Now add the allowed files to the prompt
        const finalPromptWithFiles = this.promptBuilder.addFilesToPrompt(userPrompt, allowedFiles);

        saveRunInfo(model, task, this.constructor.name, "system_prompt", systemPrompt);
        saveRunInfo(model, task, this.constructor.name, "user_prompt", finalPromptWithFiles);

        // generate response
        const aiResponse = await this.generateResponse(model, systemPrompt, finalPromptWithFiles);
        if (!aiResponse) return null;

        // parse the response
        const parsed = this.handleResponse(model, task, aiResponse.response);

        return {
            ...aiResponse,
            response: parsed,
            responseStr: aiResponse.response,
            calculatedTokens: totalTokens,
        };
    }

    protected abstract handleResponse(model: string, task: string, response: string): T;

    protected async generateResponse(
        model: string,
        systemPrompt: string,
        prompt: string
    ): Promise<AIResponse | null> {
        // pick the ai model
        const aiService =
            model === LLM_MODELS.OPENAI_GPT_4O_MINI || model === LLM_MODELS.OPENAI_GPT_4O
                ? new OpenAIService()
                : new ClaudeAIService();

        // generate code
        const { response, inputTokens, outputTokens, cost } = await aiService.generateResponse(
            systemPrompt,
            prompt
        );

        return {
            response,
            inputTokens,
            outputTokens,
            cost,
        };
    }
}

export { BaseAssistant };
