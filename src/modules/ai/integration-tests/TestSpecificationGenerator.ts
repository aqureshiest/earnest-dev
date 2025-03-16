import { StandardAssistant } from "../assistants/StandardAssistant";
import { PromptBuilder } from "../support/PromptBuilder";
import { TokenLimiter } from "../support/TokenLimiter";
import { IntegrationQuestion } from "./IntegrationMapQuestionsAssistant";

export interface TestSpecGeneratorRequest {
    taskId: string;
    model: string;
    task: string;
    params: {
        projectName: string;
        projectDescription: string;
        prdContent?: string;
        integrationMapAnalysis: string;
        figmaScreensAnalysis?: string;
        questions: IntegrationQuestion[];
        finalOutputPrompt?: string;
    };
}

export class TestSpecificationGenerator extends StandardAssistant<
    TestSpecGeneratorRequest,
    string
> {
    constructor() {
        super(new PromptBuilder(), new TokenLimiter());
    }

    responseType: string = "md";

    getSystemPrompt(): string {
        return `You are a senior quality engineer creating a comprehensive integration test specification document.
Generate a well-structured, professional document that provides clear guidance for implementing integration tests.
Use markdown formatting with appropriate headings, bullet points, tables, and code examples when relevant.
Focus on clarity, completeness, and practical implementation details.`;
    }

    getPrompt(request: TestSpecGeneratorRequest): string {
        const {
            projectName,
            projectDescription,
            prdContent,
            integrationMapAnalysis,
            figmaScreensAnalysis,
            questions,
            finalOutputPrompt,
        } = request.params;

        // Format the questions and answers for the prompt
        const questionsAndAnswers = questions
            .filter((q) => q.answer.length > 0)
            .map((q) => {
                const selectedChoices = q.choices
                    .filter((c) => q.answer.includes(c.id))
                    .map((c) => c.text);

                const answerText =
                    q.type === "multiple" ? selectedChoices.join(", ") : selectedChoices[0] || "";

                return `Q: ${q.question}\nA: ${answerText}`;
            })
            .join("\n\n");

        return `Create a comprehensive integration test specification document for the following project:
 
# Project: ${projectName}
Description: ${projectDescription}

## Integration Architecture Analysis
${integrationMapAnalysis}

${figmaScreensAnalysis ? `## UI/UX Analysis\n${figmaScreensAnalysis}` : ""}

${prdContent ? `## Product Requirements\n${prdContent.substring(0, 2000)}...\n` : ""}

## Clarifying Questions and Answers
${questionsAndAnswers || "No specific clarifications provided."}

## Output:
${request.params.finalOutputPrompt || TestSpecificationGenerator.PROMPT_OUTPUT}
`;
    }

    static PROMPT_OUTPUT = `Please create a detailed integration test specification document with the following sections:

1. Introduction
   - Purpose and scope of testing
   - Testing approach overview
   - Project background

2. Integration Architecture
   - High-level architecture overview
   - Key integration points
   - Data flows
   - System dependencies

3. Test Environment
   - Environment setup requirements
   - Mock/stub services needed
   - Data requirements
   - Tools and frameworks

4. Test Scenarios
   - Detailed test scenarios grouped by integration point
   - Prioritization of test scenarios
   - Test case details for each scenario
   - Coverage matrix

5. Test Data
   - Test data requirements
   - Data setup and teardown procedures
   - Mock data specifications

6. Execution Strategy
   - Test execution approach
   - Continuous integration considerations
   - Test dependencies and sequence

7. Success Criteria
   - Acceptance criteria
   - Expected outcomes
   - Quality gates

Use clear markdown formatting with appropriate headings, code blocks, tables, and bullet points.
Ensure the document provides practical, implementable guidance for quality engineers.
`;

    protected handleResponse(response: string, taskId?: string): string {
        return response;
    }
}
