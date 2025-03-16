import { ImageProcessingAssistant } from "../assistants/ImageProcessingAssistant";
import { PromptBuilder } from "../support/PromptBuilder";
import { TokenLimiter } from "../support/TokenLimiter";

export interface IntegrationMapTaskRequest extends ImageProcessTaskRequest {}

export class IntegrationMapProcessor extends ImageProcessingAssistant<
    IntegrationMapTaskRequest,
    string
> {
    constructor() {
        super(new PromptBuilder(), new TokenLimiter());
    }

    responseType: string = "md";

    getSystemPrompt(): string {
        return `You are an expert quality engineer specializing in integration testing.
Your task is to analyze system architecture diagrams and integration maps with particular attention to:
1. Service boundaries and interactions
2. API endpoints and data flows 
3. Dependencies between components
4. Potential failure points and edge cases
5. Critical integration paths

Provide specific, detailed analysis in markdown format that can be used to generate integration test specifications.`;
    }

    getPrompt(request: IntegrationMapTaskRequest): string {
        const { projectName, projectDescription } = request.params;

        return `This architecture diagram is part of the "${projectName}" project: ${projectDescription}

Please analyze this integration map and provide a comprehensive markdown document covering:

1. Service Identification
   - List all services/components visible in the diagram
   - Describe their primary responsibilities

2. Integration Points
   - Identify all APIs, endpoints, and interfaces between components
   - Note the data flow direction and payload types if visible

3. Dependencies
   - Document dependencies between services
   - Classify them (sync/async, critical/non-critical)

4. Potential Test Focus Areas
   - Identify complex interactions that would benefit from integration testing
   - Note potential failure points or edge cases

Format your response with clear markdown headings and use bullet points for better readability. 
Include specific details about each service and integration point that would be relevant for test planning.`;
    }

    protected handleResponse(response: string, taskId?: string): string {
        return response;
    }
}
