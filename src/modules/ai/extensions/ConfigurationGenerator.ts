import { OpenAIService } from "../clients/OpenAIService";
import { PromptGenerator } from "./PromptGenerator";
import { ExtensionConfig } from "./types";
import { normalizeSchemaType } from "./types";

interface ConversationResponse {
    message: string;
    configUpdate?: Partial<ExtensionConfig>;
    conversationComplete: boolean;
}

export class ConfigurationGenerator {
    private readonly aiService: OpenAIService;
    private readonly promptGenerator: PromptGenerator;

    private readonly CONVERSATION_PROMPT = `You are helping a developer create an AI-powered code analysis extension. You need to gather key information through a conversation to populate the following configuration type:

interface ExtensionConfig {
    name: string;
    description: string;
    systemPrompt: string;   
    outputSchema: {
        type: string;
        structure: Record<string, any>;
        responseFormat: string;
        normalizedType?: string;
    };
    uiConfig: {
        visualization: string;
        inputFields: Array<{
            name: string;
            type: string;
            required: boolean;
            description: string;
        }>;
        outputViews: Array<{
            type: string;
            description: string;
        }>;
    };
    userInput?: {
        required: boolean;
        useRelevantFiles: boolean;
        description: string;
    };
}

Focus on gathering these key aspects through conversation:

1. Extension Purpose: Already provided in initial message - use this to populate name, description
2. User Input Requirements:
   - Determine if the extension needs user input during execution
   - Determine if analysis should be limited to files relevant to that input
   - This will help populate: userInput object and uiConfig.inputFields

3. Output Format:
   - Get a description of the desired output format
   - Example: "swagger documentation for api endpoints"
   - This will help populate: outputSchema and uiConfig.outputViews

IMPORTANT GUIDELINES:
- If this is the first message and contains a clear description, use it to populate name/description and move to gathering input requirements
- Ask ONE question at a time
- Keep questions concise and clear
- Only move to the next aspect once you have clear information about the current one
- If you already have all three pieces of information, help refine the configuration
- If the user provides additional useful information at any point, incorporate it into the configuration
- Maintain a friendly, conversational tone

Respond with a JSON object:
{
    "message": "Your next question or acknowledgment",
    "configUpdate": {
        // partial ExtensionConfig object with any new information
        // must match the type structure above
        // omit if no new information to update
    },
    "conversationComplete": boolean // true if we have enough information for all required fields
}`;

    constructor() {
        this.aiService = new OpenAIService();
        this.promptGenerator = new PromptGenerator();
    }

    public async extractInitialConfig(message: string): Promise<Partial<ExtensionConfig>> {
        const initialAnalysis = await this.aiService.generateResponse(
            `Extract the extension name and description from this message. If the message clearly describes an extension purpose, return a JSON object with name and description. If the message is unclear or doesn't describe an extension, return an empty object.

            Message: "${message}"
            
            Response format:
            {
                "name": "string", // A concise name for the extension
                "description": "string" // A clear description of what the extension does
            }`,
            message
        );

        try {
            return JSON.parse(initialAnalysis.response);
        } catch (error) {
            console.warn("Failed to parse initial config, continuing with empty config");
            return {};
        }
    }

    public async getNextConversationStep(
        messages: { role: string; content: string }[],
        currentConfig: Partial<ExtensionConfig>
    ): Promise<ConversationResponse> {
        const analysis = await this.aiService.generateResponse(
            this.CONVERSATION_PROMPT,
            `Current Config: ${JSON.stringify(currentConfig || {}, null, 2)}
             
             Conversation History:
             ${messages.map((m) => `${m.role}: ${m.content}`).join("\n")}
             
             Based on this context, determine the next question or action.`
        );

        try {
            return JSON.parse(analysis.response);
        } catch (error) {
            console.error("Failed to parse AI response:", error);
            throw new Error("Invalid response format from AI service");
        }
    }

    public async generateFullConfig(config: Partial<ExtensionConfig>): Promise<ExtensionConfig> {
        const fullConfig = await this.promptGenerator.generateExtensionPrompt(
            JSON.stringify(config, null, 2)
        );

        return {
            ...config,
            ...fullConfig,
            id: config.name
                ?.toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, ""),
            outputSchema: {
                ...fullConfig.outputSchema,
                normalizedType: normalizeSchemaType(fullConfig.outputSchema.type),
            },
        } as ExtensionConfig;
    }
}
