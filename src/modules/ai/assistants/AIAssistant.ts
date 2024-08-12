interface AIAssistantRequest {
    model: string;
    task: string;
    files: FileDetails[];
    params?: any;
}

interface AIAssistantResponse<T> {
    response: T;
    calculatedTokens: number;
    inputTokens: number;
    outputTokens: number;
    cost: number;
}

interface AIAssistant<T> {
    getSystemPrompt(): string;

    getPrompt(params?: any): string;

    process(request: AIAssistantRequest): Promise<AIAssistantResponse<T> | null>;
}
