import { CodebaseChunksAssistant } from "../assistants/CodebaseChunksAssistant";
import { PromptBuilder } from "../support/PromptBuilder";
import { TokenLimiter } from "../support/TokenLimiter";
import { ResponseParser } from "../support/ResponseParser";
import { CODEFILES_PLACEHOLDER } from "@/constants";
import { ExtensionConfig } from "./types";

export class DynamicAssistant extends CodebaseChunksAssistant<any> {
    private responseParser: ResponseParser<any>;
    private extensionConfig: ExtensionConfig;

    constructor(config: ExtensionConfig) {
        super(new PromptBuilder(), new TokenLimiter());
        this.responseParser = new ResponseParser<any>();
        this.extensionConfig = config;
    }

    getSystemPrompt(): string {
        return this.extensionConfig.systemPrompt;
    }

    getPrompt(params?: any): string {
        const resultKey = this.extensionConfig.outputSchema.resultKey;
        return `
Here are the existing code files you will be working with:
<existing_codebase>
${CODEFILES_PLACEHOLDER}
</existing_codebase>

Your response must be a valid JSON object with a key '${resultKey}' containing data that follows this schema:
${JSON.stringify(this.extensionConfig.outputSchema.structure, null, 2)}

Example response:
{
    "${resultKey}": // Your analyzed data here
}

Analyze the codebase according to the instructions above and return the results in the specified format.`;
    }

    protected handleResponse(response: string): any {
        try {
            // First try to find JSON in a code block
            const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (codeBlockMatch) {
                const result = JSON.parse(codeBlockMatch[1]);
                return result;
            }

            // Fallback to looking for raw JSON
            const jsonMatch = response.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
            if (jsonMatch) {
                const result = JSON.parse(jsonMatch[0]);
                return result;
            }
        } catch (error) {
            console.error("Failed to parse response:", error);
            throw error;
        }
    }

    protected aggregateResponses(responses: (any | null)[]): any {
        // Combine responses based on the schema type
        const aggregated: any = {};

        responses.forEach((response) => {
            if (response) {
                Object.entries(response).forEach(([key, value]) => {
                    if (Array.isArray(value)) {
                        if (!aggregated[key]) {
                            aggregated[key] = [];
                        }
                        aggregated[key].push(...value);
                    } else if (typeof value === "object") {
                        aggregated[key] = { ...aggregated[key], ...value };
                    } else {
                        aggregated[key] = value;
                    }
                });
            }
        });

        return aggregated;
    }
}
