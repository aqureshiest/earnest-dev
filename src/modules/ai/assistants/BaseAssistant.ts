import { PromptBuilder } from "../support/PromptBuilder";
import { TokenLimiter } from "../support/TokenLimiter";
import { AIServiceFactory } from "../clients/AIServiceFactory";

abstract class BaseAssistant<T extends TaskRequest, R> implements AIAssistant<T, R> {
    constructor(protected promptBuilder: PromptBuilder, protected tokenLimiter: TokenLimiter) {}

    responseType: string = "xml";

    abstract getSystemPrompt(): string;
    abstract getPrompt(params?: any): string;

    abstract process(request: T): Promise<AIAssistantResponse<R> | null>;

    protected abstract handleResponse(response: string): R;

    protected async generateResponse(
        model: string,
        systemPrompt: string,
        prompt: string
    ): Promise<AIResponse | null> {
        // pick the ai model
        const aiService = AIServiceFactory.createAIService(model);

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
