import { LLM_MODELS } from "@/modules/utils/llmInfo";
import { ClaudeAIService } from "../clients/ClaudeAIService";
import { OpenAIService } from "../clients/OpenAIService";
import { PromptBuilder } from "../support/PromptBuilder";
import { TokenLimiter } from "../support/TokenLimiter";

abstract class BaseAssistant<T extends TaskRequest, R> implements AIAssistant<T, R> {
    constructor(protected promptBuilder: PromptBuilder, protected tokenLimiter: TokenLimiter) {}

    abstract getSystemPrompt(): string;
    abstract getPrompt(params?: any): string;

    abstract process(request: T): Promise<AIAssistantResponse<R> | null>;

    protected abstract handleResponse(request: T, response: string): R;

    protected async generateResponse(
        model: string,
        systemPrompt: string,
        prompt: string
    ): Promise<AIResponse | null> {
        // pick the ai model
        const aiService =
            model === LLM_MODELS.OPENAI_GPT_4O_MINI || model === LLM_MODELS.OPENAI_GPT_4O
                ? new OpenAIService(model)
                : new ClaudeAIService(model);

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

    protected responseType(): string {
        return "xml"; // default response type
    }
}

export { BaseAssistant };
