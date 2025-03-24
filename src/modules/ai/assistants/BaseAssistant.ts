import { PromptBuilder } from "../support/PromptBuilder";
import { TokenLimiter } from "../support/TokenLimiter";
import { AIServiceFactory } from "../clients/AIServiceFactory";

abstract class BaseAssistant<T extends TaskRequest, R> implements AIAssistant<T, R> {
    // how much of the token context window should be used for the user prompt
    protected tokenAllocation: number = 50;

    // override model in specialized cases
    protected overrideModel: string | null = null;

    constructor(protected promptBuilder: PromptBuilder, protected tokenLimiter: TokenLimiter) {}

    responseType: string = "xml";

    abstract getSystemPrompt(): string;
    abstract getPrompt(request: T): string;

    abstract process(
        request: T,
        onToken?: (token: string) => void
    ): Promise<AIAssistantResponse<R> | null>;

    protected abstract handleResponse(response: string, taskId?: string): R;

    protected async generateResponse(
        model: string,
        systemPrompt: string,
        prompt: string,
        onToken?: (token: string) => void
    ): Promise<AIResponse | null> {
        // pick the ai model
        const aiService = AIServiceFactory.createAIService(model);

        // generate code
        return await aiService.generateResponse(systemPrompt, prompt, onToken);
    }

    protected async generateImageResponse(
        model: string,
        systemPrompt: string,
        prompt: string,
        imageBuffer: Buffer,
        media_type: "image/png" | "application/pdf"
    ): Promise<AIResponse | null> {
        // pick the ai model
        const aiService = AIServiceFactory.createAIService(model);

        // generate code
        return await aiService.generateImageResponse(systemPrompt, prompt, imageBuffer, media_type);
    }
}

export { BaseAssistant };
