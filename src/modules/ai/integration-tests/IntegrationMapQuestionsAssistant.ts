import { v4 as uuidv4 } from "uuid";
import { StandardAssistant } from "../assistants/StandardAssistant";
import { PromptBuilder } from "../support/PromptBuilder";
import { TokenLimiter } from "../support/TokenLimiter";

export interface IntegrationQuestion {
    id: string;
    question: string;
    type: "single" | "multiple";
    choices: {
        id: string;
        text: string;
    }[];
    answer: string[];
}

export interface IntegrationQuestions {
    title: string;
    questions: IntegrationQuestion[];
}

export interface QuestionGeneratorRequest extends TaskRequest {
    params: {
        integrationMapAnalysis: string;
        prdContent?: string;
        projectName: string;
        projectDescription: string;
        stage: "map" | "final";
    };
}

export class IntegrationQuestionsGenerator extends StandardAssistant<
    QuestionGeneratorRequest,
    IntegrationQuestions
> {
    constructor() {
        super(new PromptBuilder(), new TokenLimiter());
    }

    responseType: string = "json";

    getSystemPrompt(): string {
        return `You are a senior quality engineer specializing in integration testing.
Your task is to generate important questions about integration testing for this project.
Each question should be single or multiple choice and help clarify critical aspects of the test approach.`;
    }

    getPrompt(request: QuestionGeneratorRequest): string {
        const { integrationMapAnalysis, prdContent, projectName, projectDescription, stage } =
            request.params;

        if (stage === "map") {
            return `Based on the integration map analysis, generate 5-10 critical questions that will help refine the integration test strategy.
    
Project Name: ${projectName}
Project Description: ${projectDescription}

Integration Map Analysis:
${integrationMapAnalysis}

${prdContent ? `Additional Context from PRD:\n${prdContent.substring(0, 1000)}...\n` : ""}

Generate questions that will help clarify:
1. Critical integration paths
2. Service communication patterns
3. Important test scenarios
4. Potential edge cases and error conditions
5. Test data requirements

Each question should be single or multiple choice with 2-4 clear options.

Return a JSON object in the following format:
{
  "title": "Integration Architecture Questions",
  "questions": [
    {
      "id": "q1",
      "question": "Question text here",
      "type": "single", // or "multiple"
      "choices": [
        { "id": "c1", "text": "Choice 1" },
        { "id": "c2", "text": "Choice 2" }
      ],
      "answer": [] // Will be filled by user
    }
  ]
}`;
        } else {
            // Final stage questions for test specification
            return `Based on all the analysis so far, generate 3-5 final questions that will help refine the integration test specification.
    
Project Name: ${projectName}
Project Description: ${projectDescription}

Integration Map Analysis:
${integrationMapAnalysis}

${prdContent ? `Additional Context from PRD:\n${prdContent.substring(0, 1000)}...\n` : ""}

Generate questions that will help clarify:
1. Test scope and coverage
2. Test environment requirements
3. Test data setup and management
4. Test execution approach
5. Validation criteria and expected results

Each question should be single or multiple choice with 2-4 clear options.

Return a JSON object in the following format:
{
  "title": "Integration Test Specification Questions",
  "questions": [
    {
      "id": "q1",
      "question": "Question text here",
      "type": "single", // or "multiple"
      "choices": [
        { "id": "c1", "text": "Choice 1" },
        { "id": "c2", "text": "Choice 2" }
      ],
      "answer": [] // Will be filled by user
    }
  ]
}`;
        }
    }

    protected handleResponse(response: string, taskId?: string): IntegrationQuestions {
        try {
            // Find the first JSON object in the response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error("No JSON object found in response");
            }

            const parsed = JSON.parse(jsonMatch[0]);

            // Ensure all questions have IDs
            const questions = parsed.questions.map((q: any) => ({
                id: q.id || uuidv4(),
                question: q.question,
                type: q.type || "single",
                choices: q.choices.map((c: any) => ({
                    id: c.id || uuidv4(),
                    text: c.text,
                })),
                answer: [],
            }));

            return {
                title: parsed.title || "Integration Testing Questions",
                questions,
            };
        } catch (error: any) {
            console.error("Error parsing AI response:", error);
            console.error("Raw response:", response);

            // Return a simple default question if parsing fails
            return {
                title: "Integration Testing Questions",
                questions: [
                    {
                        id: uuidv4(),
                        question: "What are the most critical integration points to test?",
                        type: "multiple",
                        choices: [
                            { id: uuidv4(), text: "Service-to-service API calls" },
                            { id: uuidv4(), text: "Database interactions" },
                            { id: uuidv4(), text: "External system integrations" },
                            { id: uuidv4(), text: "Messaging and event flows" },
                        ],
                        answer: [],
                    },
                ],
            };
        }
    }
}
