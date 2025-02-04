import {
    CODEFILES_PLACEHOLDER,
    GAP_ANALYSIS_PLACEHOLDER,
    REPO_ANALYSIS_PLACEHOLDER,
    TECHNICAL_DESIGN_DOC_PLACEHOLDER,
} from "@/constants";
import { PromptBuilder } from "../../support/PromptBuilder";
import { ResponseParser } from "../../support/ResponseParser";
import { TokenLimiter } from "../../support/TokenLimiter";
import { CodebaseAssistant } from "../CodebaseAssistant";

export class TasksForGapsAssistant extends CodebaseAssistant<string> {
    private responseParser: ResponseParser<string>;

    constructor() {
        super(new PromptBuilder(), new TokenLimiter());

        this.responseParser = new ResponseParser<string>();
    }

    override getSystemPrompt(): string {
        return `
You are an expert project manager and software architect tasked with creating a comprehensive set of Jira epics and tickets for a software development project.

<objective>
Create a detailed set of Jira epics and tickets that cover all necessary work to implement the changes outlined in the technical design document (TDD) and address the gaps identified in the gap analysis, while considering the current system state and codebase.
</objective>

<instructions>
<summary>
* Review the gap analysis, technical design document, system analysis, and codebase
* Create epics for major features, changes, or groups of related work
* Break down each epic into specific, actionable tickets
* Ensure each ticket is clear, concise, and actionable
* Reference specific sections of the codebase or system analysis where relevant
* Cover all aspects of the required changes, including:
  - New feature implementation
  - Modifications to existing features
  - Architectural changes
  - Data model updates
  - API changes or additions
  - Performance improvements
  - Security enhancements
  - Testing requirements
* Include tickets for necessary documentation updates
* Create tickets for any required refactoring or tech debt addressed by the TDD
</summary>

<considerations>
* Aim for tickets that represent about a day's work for a developer
* Ensure tickets are self-contained and can be worked on independently where possible
* Consider dependencies between tickets and note them
* Use clear, consistent naming conventions for epics and tickets
* Include acceptance criteria for each ticket
* Tag tickets with appropriate categories (e.g., frontend, backend, database)
* Consider breaking very large epics into sub-epics if necessary
</considerations>

<constraints>
* Do not make assumptions about implementation details not specified in the provided documents
* Avoid creating tickets for project management tasks (e.g., "Have a team meeting")
* Do not assign story points or time estimates to tickets
* Refrain from assigning tickets to specific team members
</constraints>
</instructions>
`;
    }

    override getPrompt(params: any | null): string {
        return `
Here is all the input provided for your task:

**Here is the existing codebase (might be truncated to fit within context)**:
<existing_codebase>
  ${CODEFILES_PLACEHOLDER}
</existing_codebase>

**Here is the overall system analysis of the entire existing codebase**:
${REPO_ANALYSIS_PLACEHOLDER}

**Here is the technical design document**:
<technical_design_document>
${TECHNICAL_DESIGN_DOC_PLACEHOLDER}
</technical_design_document>

**Here is the gap analysis**:
${GAP_ANALYSIS_PLACEHOLDER}

<response_format_instructions>
Respond in the following XML format:

<jira_tasks>
  <epic>
    <name></name>
    <description></description>
    <tickets>
      <ticket>
        <title></title>
        <description></description>
        <acceptance_criteria>
          <criterion></criterion>
          <!-- Repeat for each acceptance criterion -->
        </acceptance_criteria>
        <type>feature/bug/improvement/etc</type>
        <category>frontend/backend/database/etc</category>
        <dependencies>
          <dependency></dependency>
          <!-- List any ticket dependencies -->
        </dependencies>
        <codebase_references>
          <!-- List any specific files or components that will be affected -->
        </codebase_references>
      </ticket>
      <!-- Repeat for each ticket in the epic -->
    </tickets>
  </epic>
  <!-- Repeat for each epic -->
</jira_tasks>
</response_format_instructions>

Based on these instructions, create a comprehensive set of Jira epics and tickets to implement the required changes and improvements, using the specified XML format for your response.
`;
    }

    protected handleResponse(response: string): string {
        // extract the jira_tasks block
        const match = response.match(/<jira_tasks>[\s\S]*<\/jira_tasks>/);
        const matchedBlock = match ? match[0] : "";

        // Parse the response into an intermediate format
        // const parsedData = this.responseParser.parse(matchedBlock) as any;

        return matchedBlock;
    }
}
