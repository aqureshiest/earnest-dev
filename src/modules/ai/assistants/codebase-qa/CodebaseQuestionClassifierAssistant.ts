import { LLM } from "@langchain/core/language_models/llms";
import { PromptBuilder } from "../../support/PromptBuilder";
import { TokenLimiter } from "../../support/TokenLimiter";
import { StandardAssistant } from "../StandardAssistant";
import { LLM_MODELS } from "@/modules/utils/llmInfo";

export interface QuestionClassification {
    isGeneral: boolean; // True if question is general/broad, false if specific
    confidence: number; // 0-1 confidence score
    enhancedQuery?: string; // Optional enhanced query for semantic search
}

export class CodebaseQuestionClassifierAssistant extends StandardAssistant<
    CodebaseQuestionRequest,
    QuestionClassification
> {
    responseType = "json";

    // override model to a smaller one
    overrideModel = LLM_MODELS.AWS_BEDROCK_CLAUDE_35_HAIKU_V2.id;

    constructor() {
        super(new PromptBuilder(), new TokenLimiter());
    }

    getSystemPrompt(): string {
        return `
You are a query classifier for a codebase question answering system. Your job is to determine if a user's question about a codebase is general/broad or specific.

- General/broad questions: Questions about the overall codebase, architecture, patterns, or that would require knowledge of many files to answer accurately. Examples: "Explain this repo", "How does authentication work?", "What's the architecture?", "Walk me through the main components" 

- Specific questions: Questions about particular files, functions, endpoints, or focused on a single feature or component. Examples: "What does the AuthService.login method do?", "Explain the route.tsx file", "How is the user state managed?"

Respond in JSON format with the following properties:
- isGeneral: boolean (true if the question is general/broad, false if specific)
- confidence: number between 0-1 representing your confidence in the classification
- enhancedQuery: string (an improved version of the query that might help with semantic search)
`;
    }
    getPrompt(request: CodebaseQuestionRequest): string {
        return `
Question about a codebase: "${request.task}"

Classify this query as general or specific, include a confidence score, and provide an enhanced version of the query that might work better for semantic search while preserving the original intent.

Return ONLY a JSON object with isGeneral, confidence, and enhancedQuery.
`;
    }
    protected handleResponse(response: string, taskId?: string): QuestionClassification {
        // Parse the JSON response
        try {
            // Remove any surrounding code block markers
            if (response.startsWith("```json")) {
                response = response
                    .replace(/^```json\s*/, "")
                    .replace(/```$/, "")
                    .trim();
            }
            const classification: QuestionClassification = JSON.parse(response);

            // Validate the response structure
            if (
                typeof classification.isGeneral !== "boolean" ||
                typeof classification.confidence !== "number" ||
                (classification.enhancedQuery && typeof classification.enhancedQuery !== "string")
            ) {
                throw new Error("Invalid response format");
            }

            return classification;
        } catch (error) {
            console.error("Error parsing response:", error);

            // Fallback to a default response if parsing fails
            return {
                isGeneral: false,
                confidence: 0.5,
            };
        }
    }
}
