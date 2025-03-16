import { PRDTaskRequest } from "@/types/prd";
import { StandardAssistant } from "../../ai/assistants/StandardAssistant";
import { PromptBuilder } from "../../ai/support/PromptBuilder";
import { TokenLimiter } from "../../ai/support/TokenLimiter";

export class PRDAssistantMainSection extends StandardAssistant<PRDTaskRequest, string> {
    constructor() {
        super(new PromptBuilder(), new TokenLimiter());
    }

    responseType: string = "md";

    getSystemPrompt(): string {
        return `You are a senior product manager creating a comprehensive PRD.
Generate the following sections in markdown:

# Overview
# Business Goals
# User Goals
# Non Goals`;
    }

    getPrompt(request: PRDTaskRequest): string {
        const input = request.input;

        return `Based on this input pro, generate the PRD sections:

## Goal Statement: ${input.goalStatement}

## Target Audience: ${input.targetAudience.join("\n")}

## Key Features:
${input.keyFeatures.map((f) => `- ${f.name}: ${f.description}`).join("\n")}

### Constraints: ${input.constraints.join("\n")}

### Requirements:
1. Generate only the Overview, Business Goals, User Goals, and Non Goals sections
2. Use clear markdown formatting
3. Be specific and practical rather than theoretical
`;
    }

    protected handleResponse(response: string, taskId?: string): string {
        return response;
    }
}
