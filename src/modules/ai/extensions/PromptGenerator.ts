import { OpenAIService } from "../clients/OpenAIService";
import { PromptGeneratorOutput } from "./types";

export class PromptGenerator {
    private readonly aiService: OpenAIService;

    private readonly META_PROMPT = `You are a system prompt engineering expert. Your task is to expand a configuration into a comprehensive system prompt for an AI assistant.

The configuration will contain information about what the extension should do, and you need to create a specialized prompt that will help the AI achieve that goal effectively.

The prompt you create should include:
1. Clear task definition and scope
2. Specific instructions for the AI to follow
3. Structured response format in XML
4. Validation rules and constraints
5. Error handling guidelines

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
        structure: {        // TypeScript-like schema of the output
            [key: string]: {
                type: string;
                description: string;
                required?: boolean;
            };
        };
        responseFormat: string;  // XML format specification
    };
    uiConfig: {
        visualization: string;  // How the output should be displayed (e.g., "table", "tree", "chart")
        inputFields: Array<{
            name: string;
            type: "text" | "select" | "multiselect" | "boolean";
            label: string;
            description: string;
            required: boolean;
            options?: string[];  // For select/multiselect types
            default?: any;
        }>;
        outputViews: Array<{
            type: string;      // View type (e.g., "summary", "detailed", "visual")
            description: string;
        }>;
    };
}

Ensure you maintain consistency between:
1. The system prompt's expected output format
2. The outputSchema structure
3. The visualization and output views

Example response structure:
{
    "systemPrompt": "You are an AI assistant...",
    "outputSchema": {
        "type": "AnalysisResult",
        "structure": {
            "summary": {
                "type": "string",
                "description": "Brief overview of the analysis",
                "required": true
            }
        },
        "responseFormat": "<analysis>...</analysis>"
    },
    "uiConfig": {
        "visualization": "structured-text",
        "inputFields": [{
            "name": "depth",
            "type": "select",
            "label": "Analysis Depth",
            "description": "How detailed should the analysis be",
            "required": true,
            "options": ["basic", "detailed", "comprehensive"]
        }],
        "outputViews": [{
            "type": "summary",
            "description": "Condensed overview of results"
        }]
    }
}`;

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
                !parsed.outputSchema.responseFormat
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
