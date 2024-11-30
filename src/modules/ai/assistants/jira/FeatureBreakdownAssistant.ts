import { TECHNICAL_DESIGN_DOC_PLACEHOLDER } from "@/constants";
import { PromptBuilder } from "@/modules/ai/support/PromptBuilder";
import { ResponseParser } from "@/modules/ai/support/ResponseParser";
import { TokenLimiter } from "@/modules/ai/support/TokenLimiter";
import { StandardAssistant } from "@/modules/ai/assistants/StandardAssistant";

export class FeatureBreakdownAssistant extends StandardAssistant<TaskRequest, FeatureBreakdown> {
    private responseParser: ResponseParser<FeatureBreakdown>;

    constructor() {
        super(new PromptBuilder(), new TokenLimiter());

        this.responseParser = new ResponseParser<FeatureBreakdown>();
    }

    getSystemPrompt(): string {
        return `
You are an expert software architect tasked with breaking down a technical design document into implementable features and tasks.
 
<objective>
Analyze the provided Technical Design Document (TDD) to create a comprehensive list of features, each with specific tasks and subtasks. Focus on capturing high-level but sufficient technical details at each level to guide implementation.
</objective>

<instructions>
1. Carefully review the provided Technical Design Document.
2. Identify the main features described in the TDD.
3. For each feature:
   a. Create a clear, concise description of the feature.
   b. Break down the feature into specific tasks and subtasks.
   c. For each task and subtask, provide:
      - A clear, actionable description
      - High-level technical details crucial for implementation, such as:
        * API endpoints or changes
        * Database modifications
        * Integration points with other system components
        * Key algorithms or data structures to be used
   d. Indicate any dependencies between tasks or with other features.
   e. Assign a rough complexity estimate (Low/Medium/High) to each task.
4. Ensure all tasks and subtasks are specific enough to guide implementation without prescribing exact code-level details.
</instructions>

<considerations>
- Maintain a balance between providing sufficient technical detail and keeping descriptions high-level.
- Focus on capturing the "what" and "why" of each feature and task, rather than the specific "how".
- Ensure that the feature breakdown aligns with the overall system architecture described in the TDD.
- Consider how features and tasks relate to each other and to the system as a whole.
</considerations>

`;
    }
    getPrompt(params?: any): string {
        return `
Here is the technical design document (TDD) to analyze:
<technical_design_document>
${TECHNICAL_DESIGN_DOC_PLACEHOLDER}
</technical_design_document>

<response_format>
Respond using the following XML format:

<FeatureBreakdown>
  <feature>
    <name>[Feature Name]</name>
    <description>[High-level description of the feature]</description>
    <tasks>
      <task>
        <name>[Task Name]</name>
        <description>[Clear, actionable description of the task]</description>
        <technicalDetails>
          <detail>[Key technical information needed for implementation]</detail>
          <!-- Add more technical details as needed -->
        </technicalDetails>
        <subtasks>
          <subtask>
            <name>[Subtask Name]</name>
            <description>[Clear, actionable description of the subtask]</description>
            <technicalDetails>
              <detail>[Key technical information for the subtask]</detail>
              <!-- Add more technical details as needed -->
            </technicalDetails>
          </subtask>
          <!-- Add more subtasks as needed -->
        </subtasks>
        <dependencies>[Any dependencies on other tasks or features]</dependencies>
        <complexity>[Low/Medium/High]</complexity>
      </task>
      <!-- Add more tasks as needed -->
    </tasks>
  </feature>
  <!-- Add more features as needed -->
</FeatureBreakdown>
</response_format>

Now, analyze the TDD and provide a breakdown of features, tasks, and subtasks based on the instructions.
`;
    }

    protected handleResponse(response: string): FeatureBreakdown {
        const options = {
            ignoreAttributes: false,
            attributeNamePrefix: "",
            isArray: (name: string, jpath: string) => {
                return ["feature", "task", "subtask", "detail"].includes(name);
            },
        };

        // extract the FeatureBreakdown block
        const match = response.match(/<FeatureBreakdown>[\s\S]*<\/FeatureBreakdown>/);
        const matchedBlock = match ? match[0] : "";

        // Parse the response into an intermediate format
        const parsedDate = this.responseParser.parse(matchedBlock, options) as any;
        return parsedDate.FeatureBreakdown as FeatureBreakdown;
    }
}
