import { ImageProcessingAssistant } from "../ai/assistants/ImageProcessingAssistant";
import { PromptBuilder } from "../ai/support/PromptBuilder";
import { TokenLimiter } from "../ai/support/TokenLimiter";

export class FigmaProcessorAssistant extends ImageProcessingAssistant<
    ImageProcessTaskRequest,
    string
> {
    constructor() {
        super(new PromptBuilder(), new TokenLimiter());
    }

    getSystemPrompt(): string {
        return `You are an expert UI/UX designer and front-end developer.
Your task is to analyze UI screenshots with particular attention to:
1. Complete user journeys and interaction flows
2. Data elements and their specifications
3. UI states (loading, error, success)
4. Edge cases and error handling
5. Component interactions and dependencies

Provide specific, detailed analysis that can be used in a PRD.`;
    }

    getPrompt(request: ImageProcessTaskRequest): string {
        const { feature, screen } = request.params;

        return `This screen is part of the "${feature.name}" feature: ${feature.description}

Please analyze this UI screen named "${screen.name}":
${screen.description ? `\nContext: ${screen.description}` : ""}

Provide a detailed analysis covering:
1. Screen Purpose & Overview
2. Key UI Components
3. User Interactions & Flows
4. Data Elements
5. Navigation & Transitions`;
    }

    protected handleResponse(response: string, taskId?: string): string {
        return response;
    }
}
