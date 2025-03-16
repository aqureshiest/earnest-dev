import { PRDTaskRequest } from "@/types/prd";
import { QuestionType, FeatureQuestion } from "@/types/prd";

import { v4 as uuidv4 } from "uuid";
import { StandardAssistant } from "../assistants/StandardAssistant";
import { PromptBuilder } from "../support/PromptBuilder";
import { TokenLimiter } from "../support/TokenLimiter";

export class FeatureQuestionsAssistant extends StandardAssistant<
    PRDTaskRequest,
    FeatureQuestion[]
> {
    constructor() {
        super(new PromptBuilder(), new TokenLimiter());
    }

    responseType: string = "json";

    getSystemPrompt(): string {
        return `You are a senior product manager helping to gather detailed requirements.
Your task is to generate 2-3 critical questions about this feature. Each question should be single or multiple choice.

Important Guidelines:
1. Make questions specific and focused on implementation details
2. Each question must have 2-3 clear choices
3. Questions should help clarify:
   - Technical requirements
   - User scenarios
   - Integration points
   - Success criteria

You must return a single JSON object in the following exact format:
{
  "questions": [
    {
      "question": "Question text here",
      "type": "single",
      "choices": [
        { "text": "Choice 1" },
        { "text": "Choice 2" }
      ]
    }
  ]
}

The response must be a single, valid JSON object containing an array of questions.`;
    }

    getPrompt(request: PRDTaskRequest): string {
        const input = request.input;
        const { feature } = request.params;

        return `Generate structured questions for this feature:

Feature Name: ${feature.name}
Description: ${feature.description}
Priority: ${feature.priority}

Product Context:
Goal Statement: ${input.goalStatement}
Target Audience: ${input.targetAudience.join(", ")}
Constraints: ${input.constraints.join(", ")}

Remember:
1. Return exactly one JSON object with a "questions" array
2. Each question must have "question", "type", and "choices" fields
3. Type must be either "single" or "multiple"
4. Each choice must have a "text" field`;
    }

    protected handleResponse(response: string, taskId?: string): FeatureQuestion[] {
        try {
            // Find the first JSON object in the response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error("No JSON object found in response");
            }

            const parsed = JSON.parse(jsonMatch[0]);

            if (!parsed.questions || !Array.isArray(parsed.questions)) {
                throw new Error("Invalid response format: missing questions array");
            }

            const questions: FeatureQuestion[] = parsed.questions.map((q: FeatureQuestion) => ({
                id: uuidv4(),
                question: q.question,
                type: q.type as QuestionType,
                choices: q.choices.map((choice: any) => ({
                    id: uuidv4(),
                    text: choice.text,
                })),
                answer: [],
            }));

            return questions;
        } catch (error: any) {
            console.error("Error parsing AI response:", error);
            console.error("Raw response:", response);
            throw new Error(`Failed to parse questions from AI response: ${error.message}`);
        }
    }
}
