import { CODEFILES_PLACEHOLDER, TECHNICAL_DESIGN_DOC_PLACEHOLDER } from "@/constants";
import { PromptBuilder } from "../../support/PromptBuilder";
import { ResponseParser } from "../../support/ResponseParser";
import { TokenLimiter } from "../../support/TokenLimiter";
import { CodebaseAssistant } from "../CodebaseAssistant";

export class TasksForCodebaseAssistant extends CodebaseAssistant<string> {
    private responseParser: ResponseParser<string>;

    constructor() {
        super(new PromptBuilder(), new TokenLimiter());

        this.responseParser = new ResponseParser<string>();
    }

    override getSystemPrompt(): string {
        return `
You are an advanced AI assistant specializing in software development and project management. Your task is to analyze a given codebase and technical design document to generate a comprehensive set of Jira epics and tickets for implementing the desired functionality, along with detailed implementation tasks.

<objective>
Thoroughly examine the provided codebase and technical design document to develop a deep understanding of the project's current state and intended outcomes. Based on this analysis, create a structured set of Jira epics and tickets that will guide the development team in implementing the desired functionality while adhering to the existing codebase structure and project goals. Additionally, provide granular, actionable tasks for each story to facilitate implementation.
</objective>

<instructions>

<analysis_phase>
1. Review the codebase, noting architecture, patterns, and coding standards.
2. Analyze the technical design document for functionality and requirements.
3. Identify discrepancies between the codebase and design document.
</analysis_phase>

<task_generation_phase>
For each functionality aspect:
1. Identify necessary codebase changes or additions.
2. Create epics and user stories aligned with existing code and technical design.
3. For each story, create granular, actionable tasks with specific implementation details.
4. Provide rationale, highlighting challenges and dependencies.
5. Suggest optimal task sequencing.
</task_generation_phase>

<considerations>
- Balance high-level planning with detailed implementation tasks.
- Assess impact on existing functionality and performance.
- Identify opportunities for code reuse or refactoring.
- Include tasks for testing and documentation updates.
- Consider non-functional requirements such as security, performance, and scalability.
- Take into account the needs of different stakeholders (end-users, administrators, maintainers).
- Assess potential risks or challenges for each epic and story.
</considerations>

<constraints>
- Exclude tasks for completed work.
- Avoid major architectural changes unless specified in the design document.
- Focus on what needs to be done and provide specific implementation steps.
- Limit tasks to those directly implementing the desired functionality.
</constraints>

</instructions>
`;
    }

    override getPrompt(params: any | null): string {
        return `
Here is the existing codebase you will be working with:
<existing_codebase>
${CODEFILES_PLACEHOLDER}
</existing_codebase>

Here is the technical design document:
<technical_design_document>
${TECHNICAL_DESIGN_DOC_PLACEHOLDER}
</technical_design_document>

<response_format_instructions>
Provide your analysis and Jira structure in the following XML format:

<project_analysis>
    <codebase_summary>Summarize the current codebase structure, patterns, and key components.</codebase_summary>
    <design_document_summary>Outline key requirements from the technical design document.</design_document_summary>
    <discrepancies_and_clarifications>List misalignments between codebase and design document.</discrepancies_and_clarifications>
</project_analysis>

<jira_structure>
    <epic>
        <key>EPIC-1</key>
        <summary>Brief, descriptive title of the epic</summary>
        <description>Detailed description of the epic's scope and objectives. Include any relevant background information or context.</description>
        <acceptance_criteria>
            <criterion>Criterion 1</criterion>
            <criterion>Criterion 2</criterion>
            <!-- Add more criteria as needed -->
        </acceptance_criteria>
        <stories>
            <story>
                <key>STORY-1</key>
                <summary>Concise description of the user story</summary>
                <description><![CDATA[
As a [type of user],
I want [an action or feature],
So that [benefit/value]

Detailed description of the work to be done.
Include any technical considerations or implementation notes.
]]></description>
                <acceptance_criteria>
                    <criterion>Criterion 1</criterion>
                    <criterion>Criterion 2</criterion>
                    <!-- Add more criteria as needed -->
                </acceptance_criteria>
                <story_points>Estimated story points (e.g., 1, 2, 3, 5, 8)</story_points>
                <priority>High/Medium/Low</priority>
                <components>List of affected codebase components</components>
                <dependencies>Any stories or tasks that must be completed first</dependencies>
                <implementation_tasks>
                    <task>
                        <title>A brief title for the task</title>
                        <description>A detailed explanation of the task, including the overall goal</description>
                        <affected_files>
                            <file>path/to/file1</file>
                            <file>path/to/file2</file>
                            <!-- Add more <file> elements as needed -->
                        </affected_files>
                        <affected_components>
                            <component>name_of_component_or_module</component>
                            <!-- Add more <component> elements if applicable -->
                        </affected_components>
                        <steps>
                            <step>Step 1</step>
                            <step>Step 2</step>
                            <!-- Add more steps as needed -->
                        </steps>
                        <effort>Estimate the effort needed for the task (e.g., hours or complexity)</effort>
                    </task>
                    <!-- Repeat <task> element for each implementation task within the story -->
                </implementation_tasks>
            </story>
            <!-- Repeat <story> element for each story within the epic -->
        </stories>
    </epic>
    <!-- Repeat <epic> element for each major feature or component -->
</jira_structure>

<implementation_roadmap>Provide a high-level overview of the suggested order of epic and story implementation, explaining the rationale behind the sequencing.</implementation_roadmap>

</response_format_instructions>

Based on the provided codebase and technical design document, please generate a comprehensive analysis and Jira ticket structure as specified above.
`;
    }

    protected handleResponse(response: string): string {
        // extract the tasks block
        const match = response.match(/<tasks>[\s\S]*<\/tasks>/);
        const matchedBlock = match ? match[0] : "";

        // Parse the response into an intermediate format
        const parsedData = this.responseParser.parse(matchedBlock) as any;

        return parsedData;
    }
}
