import { FigmaScreenAnalysis, PRDTaskRequest } from "@/types/prd";
import { StandardAssistant } from "../assistants/StandardAssistant";
import { PromptBuilder } from "../support/PromptBuilder";
import { TokenLimiter } from "../support/TokenLimiter";

export class PRDAssistantFeatureFlow extends StandardAssistant<PRDTaskRequest, string> {
    constructor() {
        super(new PromptBuilder(), new TokenLimiter());
    }

    responseType: string = "md";

    getSystemPrompt(): string {
        return `You are a senior product manager creating a detailed feature specification.
Focus on user scenarios, requirements, and success criteria that stakeholders need to understand.
Use the provided clarifying questions and answers to enhance the feature details.`;
    }

    getPrompt(request: PRDTaskRequest): string {
        const prompt = `Create a comprehensive feature specification for:
 
# Feature: {{featureName}}
Description: {{featureDescription}}
Priority: {{featurePriority}}

### Screen Analyses:
{{screenAnalyses}}

## Product Context:
- Goal: {{goalStatement}}
- Target Users: {{targetAudience}}

## Clarifying Questions and Answers:
{{clarifyingQuestions}}


## Output:
${request.params.finalOutputPrompt || PRDAssistantFeatureFlow.PROMPT_OUTPUT}`;

        const { feature, screenAnalyses } = request.params;
        const input = request.input;

        const screenAnalysesStr = screenAnalyses
            .map(
                (screen: FigmaScreenAnalysis) => `
Screen: ${screen.screenName}
Analysis: ${screen.analysis}
---`
            )
            .join("\n");

        const updatedPrompt = prompt
            .replace(/{{featureName}}/g, feature.name)
            .replace(/{{featureDescription}}/g, feature.description)
            .replace(/{{featurePriority}}/g, feature.priority)
            .replace(/{{screenAnalyses}}/g, screenAnalysesStr)
            .replace(/{{goalStatement}}/g, input.goalStatement)
            .replace(/{{targetAudience}}/g, input.targetAudience.join(", "))
            .replace(/{{clarifyingQuestions}}/g, feature.clarifyingQuestions || "");

        return updatedPrompt;
    }

    static PROMPT_OUTPUT = `Please provide a detailed analysis covering:

1. User Scenarios & Use Cases
  - Primary user scenarios this feature addresses (informed by the clarifying questions)
  - Step-by-step user journeys through the feature
  - Key user decisions and actions
  - Alternative paths and edge cases

2. Feature Requirements
  - Core functionality required (based on user responses to questions)
  - User experience requirements
  - Business rules and constraints
  - Integration requirements with other features

3. Success Metrics
  - Key performance indicators (KPIs)
  - User success criteria (incorporating feedback from questions)
  - Business success criteria
  - Quality metrics

4. Constraints & Dependencies
  - Business constraints
  - Technical limitations
  - Dependencies on other features
  - Rollout considerations

Pay special attention to the clarifying questions and answers provided.
Make sure to address any implementation preferences or constraints identified in the Q&A.`;

    protected handleResponse(response: string, taskId?: string): string {
        return response;
    }
}
