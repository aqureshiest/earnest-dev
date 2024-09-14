interface AIResponse {
    response: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
}

interface AIAssistantResponse<T> {
    response: T | null;
    responseStr: string;
    calculatedTokens: number;
    inputTokens: number;
    outputTokens: number;
    cost: number;
}

interface AIAssistant<T extends TaskRequest, R> {
    getSystemPrompt(): string;
    getPrompt(params?: any): string;
    process(request: T): Promise<AIAssistantResponse<R> | null>;
}
