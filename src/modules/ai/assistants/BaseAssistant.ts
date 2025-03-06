import { PromptBuilder } from "../support/PromptBuilder";
import { TokenLimiter } from "../support/TokenLimiter";
import { AIServiceFactory } from "../clients/AIServiceFactory";

abstract class BaseAssistant<T extends TaskRequest, R> implements AIAssistant<T, R> {
    // how much of the token context window should be used for the user prompt
    protected tokenAllocation: number = 50;

    constructor(protected promptBuilder: PromptBuilder, protected tokenLimiter: TokenLimiter) {}

    responseType: string = "xml";

    abstract getSystemPrompt(): string;
    abstract getPrompt(params?: any): string;

    abstract process(request: T): Promise<AIAssistantResponse<R> | null>;

    protected abstract handleResponse(response: string, taskId?: string): R;

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
