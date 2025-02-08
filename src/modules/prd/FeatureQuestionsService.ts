import { KeyFeature, PRDInput } from "@/types/prd";
import { BaseAIService } from "../ai/clients/BaseAIService";
import { AIServiceFactory } from "../ai/clients/AIServiceFactory";
import { QuestionType, FeatureQuestion, FeatureQuestions } from "@/types/prd";

export class FeatureQuestionsService {
    private aiService: BaseAIService;

    constructor(model: string) {
        this.aiService = AIServiceFactory.createAIService(model);
    }

    async generateQuestions(input: PRDInput): Promise<FeatureQuestions[]> {
        const questions: FeatureQuestions[] = [];

        for (const feature of input.keyFeatures) {
            const featureQuestions = await this.generateFeatureQuestions(feature, input);
            questions.push(featureQuestions);
        }

        return questions;
    }

    private async generateFeatureQuestions(
        feature: KeyFeature,
        context: PRDInput
    ): Promise<FeatureQuestions> {
        const systemPrompt = `You are a senior product manager helping to gather detailed requirements.
Your task is to generate 3-4 critical questions about this feature. Each question should be single or multiple choice.

Important Guidelines:
1. Make questions specific and focused on implementation details
2. Each question must have 2-4 clear choices
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

        const userPrompt = `Generate structured questions for this feature:

Feature Name: ${feature.name}
Description: ${feature.description}
Priority: ${feature.priority}

Product Context:
Goal Statement: ${context.goalStatement}
Target Audience: ${context.targetAudience.join(", ")}
Constraints: ${context.constraints.join(", ")}

Remember:
1. Return exactly one JSON object with a "questions" array
2. Each question must have "question", "type", and "choices" fields
3. Type must be either "single" or "multiple"
4. Each choice must have a "text" field`;

        const response = await this.aiService.generateResponse(systemPrompt, userPrompt);

        try {
            // Find the first JSON object in the response
            const jsonMatch = response.response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error("No JSON object found in response");
            }

            const parsed = JSON.parse(jsonMatch[0]);

            if (!parsed.questions || !Array.isArray(parsed.questions)) {
                throw new Error("Invalid response format: missing questions array");
            }

            const questions: FeatureQuestion[] = parsed.questions.map((q: FeatureQuestion) => ({
                id: crypto.randomUUID(),
                question: q.question,
                type: q.type as QuestionType,
                choices: q.choices.map((choice: any) => ({
                    id: crypto.randomUUID(),
                    text: choice.text,
                })),
                answer: [],
            }));

            return {
                featureId: feature.id,
                featureName: feature.name,
                questions,
            };
        } catch (error: any) {
            console.error("Error parsing AI response:", error);
            console.error("Raw response:", response.response);
            throw new Error(`Failed to parse questions from AI response: ${error.message}`);
        }
    }

    enrichPRDInput(input: PRDInput, responses: FeatureQuestions[]): PRDInput {
        return {
            ...input,
            keyFeatures: input.keyFeatures.map((feature) => {
                const featureResponses = responses.find((r) => r.featureId === feature.id);
                if (!featureResponses) return feature;

                const additionalInfo = featureResponses.questions.reduce((acc, q) => {
                    const selectedChoices = q.choices
                        .filter((c) => q.answer.includes(c.id))
                        .map((c) => c.text);

                    return {
                        ...acc,
                        [q.question]:
                            q.type === "multiple"
                                ? selectedChoices.join(", ")
                                : selectedChoices[0] || "",
                    };
                }, {});

                return {
                    ...feature,
                    additionalInfo,
                };
            }),
        };
    }
}
