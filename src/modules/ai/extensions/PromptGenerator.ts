import { OpenAIService } from "../clients/OpenAIService";
import { PromptGeneratorOutput } from "../../../types/extension";

// Example response for a line counter extension:
// {
//     "systemPrompt": "You are an AI assistant designed to count lines of code...",
//     "outputSchema": {
//         "type": "LineCountResult",
//         "structure": {
//             "type": "array",
//             "items": {
//                 "type": "object",
//                 "properties": {
//                     "fileName": {
//                         "type": "string",
//                         "description": "Name of the analyzed file",
//                         "required": true
//                     },
//                     "lineCount": {
//                         "type": "number",
//                         "description": "Number of lines in the file",
//                         "required": true
//                     }
//                 }
//             }
//         }
//     },
//     "uiConfig": {
//         "visualization": "table",
//         "inputFields": [],
//         "outputViews": [{
//             "type": "table",
//             "description": "Table showing line counts per file"
//         }]
//     }
// }

export class PromptGenerator {
    private readonly aiService: OpenAIService;

    private readonly META_PROMPT = `You are a system prompt engineering expert. Your task is to expand a configuration into a comprehensive system prompt for an AI assistant.

The configuration will contain information about what the extension should do, and you need to create a specialized prompt that will help the AI achieve that goal effectively.

The prompt you create should include:
1. Clear task definition and scope
2. Specific instructions for the AI to follow
3. JSON schema for response validation
4. Error handling guidelines

Focus on making the prompt:
- Precise and unambiguous
- Structured for consistent outputs
- Scalable for large inputs
- Maintainable and debuggable

Your response must match this TypeScript interface exactly:

interface PromptGeneratorOutput {
    systemPrompt: string;   // The complete system prompt for the AI
    outputSchema: {
        type: string;       // A descriptive name for the output type
        resultKey: string;  // Key in the output object that contains the results
        structure: {        // JSON schema of the expected output
            [key: string]: {
                type: string;
                description: string;
                required?: boolean;
                items?: any;  // For array types
            };
        };
    };
    uiConfig: {
        visualization: string;
        inputFields: Array<{
            name: string;
            type: "text" | "select" | "multiselect" | "boolean";
            label: string;
            description: string;
            required: boolean;
            options?: string[];
            default?: any;
        }>;
        outputViews: Array<{
            type: string;
            description: string;
        }>;
    };
}
`;

    constructor() {
        this.aiService = new OpenAIService();
    }

    async generateExtensionPrompt(config: string): Promise<PromptGeneratorOutput> {
        try {
            const completion = await this.aiService.generateResponse(
                this.META_PROMPT,
                `Create a specialized prompt based on this configuration: ${config}
                
                Ensure your response:
                1. Follows the exact interface structure provided
                2. Creates appropriate input fields based on the extension's needs
                3. Defines clear output schema and format
                4. Specifies suitable visualization and views

                Return as JSON.`
            );

            // Extract JSON from the response (handles both raw JSON and markdown code blocks)
            const jsonMatch = completion.response.match(/```json\s*([\s\S]*?)\s*```/) ||
                completion.response.match(/```\s*([\s\S]*?)\s*```/) || [null, completion.response];

            const response = this.parseAndValidateResponse(jsonMatch[1].trim());

            return response;
        } catch (error: any) {
            console.error("Error generating extension prompt:", error);
            throw new Error(`Failed to generate extension prompt: ${error.message}`);
        }
    }

    private parseAndValidateResponse(response: string): PromptGeneratorOutput {
        try {
            const parsed = JSON.parse(response);

            // Validate required fields
            const requiredFields = ["systemPrompt", "outputSchema", "uiConfig"];
            for (const field of requiredFields) {
                if (!parsed[field]) {
                    throw new Error(`Missing required field: ${field}`);
                }
            }

            // Validate output schema structure
            if (
                !parsed.outputSchema.type ||
                !parsed.outputSchema.structure ||
                !parsed.outputSchema.resultKey
            ) {
                throw new Error("Invalid output schema structure");
            }

            // Validate UI config
            if (
                !Array.isArray(parsed.uiConfig.inputFields) ||
                !Array.isArray(parsed.uiConfig.outputViews)
            ) {
                throw new Error("Invalid uiConfig structure");
            }

            return parsed;
        } catch (error: any) {
            throw new Error(`Invalid LLM response format: ${error.message}`);
        }
    }
}
