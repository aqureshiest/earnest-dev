import {
    CODEFILES_PLACEHOLDER,
    DETAILED_TASK_PLACEHOLDER,
    TDD_CONTEXT_PLACEHOLDER,
} from "@/constants";
import { PromptBuilder } from "@/modules/ai/support/PromptBuilder";
import { ResponseParser } from "@/modules/ai/support/ResponseParser";
import { TokenLimiter } from "@/modules/ai/support/TokenLimiter";
import { CodebaseAssistant } from "../../CodebaseAssistant";

export class JiraTicketsAssistant extends CodebaseAssistant<JiraItems> {
    private responseParser: ResponseParser<string>;

    constructor() {
        super(new PromptBuilder(), new TokenLimiter());

        this.responseParser = new ResponseParser<string>();
    }

    getSystemPrompt(): string {
        return `
You are an expert software architect and project manager, tasked with creating detailed Jira tickets for a software development project. Your goal is to create actionable work items from a given Jira Epic (represented by a DetailedTask) that developers can easily understand and implement.

<input>
You will be provided with the following information:
1. A DetailedTask from a Technical Design Document (TDD) analysis, which represents a Jira Epic.
2. Relevant portions of the TDD analysis for context, including:
   - Project overview
   - Key components of the system
   - Potential challenges and risks
   - Additional considerations
3. Code snippets from the existing codebase related to the epic.
</input>

<output>
You should produce:
1. A refined description for the Jira Epic (based on the DetailedTask)
2. Detailed Jira tickets for each Task within the DetailedTask

The Epic description should include:
- A clear, concise summary of the overall task
- The main objectives of this epic
- Any high-level technical considerations or challenges

Each Jira ticket should include:
- A clear, concise title
- A detailed description of the work to be done
- Technical details about required changes, additions, or deletions in the codebase
- References to specific files or code sections where changes are needed
- Any dependencies on other tickets or components
- Potential risks or challenges associated with the task
- Estimated complexity (Low/Medium/High, as provided in the input)
</output>

<instructions>
1. Carefully analyze the provided DetailedTask (Epic) and its context within the TDD analysis.
2. Examine the provided code snippets to understand the current implementation.
3. Refine the description for the Jira Epic based on the DetailedTask information.
4. For each Task within the DetailedTask, generate a detailed Jira ticket.
5. Ensure that the combination of all tickets covers the entire scope of the Epic.
6. Consider dependencies between tasks and suggest a logical order of implementation.
7. Be as specific as possible about the changes required in the codebase.
8. Include considerations for testing, documentation, and potential impacts on other system components.
9. Use consistent naming conventions and clearly indicate relationships between tickets and the epic.
</instructions>

<considerations>
- Focus on providing actionable, technical details that developers can immediately work on.
- Be clear about any assumptions you're making due to limited access to the full codebase.
- Consider different aspects of development: code changes, testing requirements, documentation updates, and potential impacts on other system components.
- Aim to provide enough detail that a developer can start working on the task without needing additional clarification.
- Be mindful of the potential risks and challenges associated with each task.
</considerations>

<constraints>
- You don't have access to the entire codebase, only the provided snippets. Make it clear when you're making assumptions based on limited information.
- You can't execute or test code. All suggestions should be based on static analysis and your expertise.
- Stick to the scope of the given DetailedTask (Epic). Don't introduce new features or changes that aren't part of the task description or directly implied by it.
</constraints>

`;
    }
    getPrompt(params?: any): string {
        return `
Here are the relevant code snippets from the existing codebase:
<code_snippets>
${CODEFILES_PLACEHOLDER}
</code_snippets>

Here is the relevant context from the TDD analysis:
<tdd_context>
${TDD_CONTEXT_PLACEHOLDER}
</tdd_context>

Here is the DetailedTask (Epic) you will be working on:
<detailed_task>
${DETAILED_TASK_PLACEHOLDER}
</detailed_task>

<response_format_instructions>
Please provide your output in the following XML format:

<jira_items>
    <epic>
        <title>[Epic title - use the DetailedTask name]</title>
        <description>[Refined epic description based on the DetailedTask]</description>
        <technical_details>[Overall technical considerations for the epic]</technical_details>
        <estimated_complexity>[Low/Medium/High - use the highest complexity from subtasks]</estimated_complexity>
        <affected_components>
            <component>[Name of affected component or module]</component>
            <!-- Repeat for each affected component -->
        </affected_components>
    </epic>
    <tickets>
        <ticket>
            <title>[Ticket title - based on the Task name]</title>
            <description>[Detailed ticket description - based on the Task description]</description>
            <technical_details>[Specific technical details for implementation - elaborate on Task technical details]</technical_details>
            <affected_files>
                <file>[Path to affected file]</file>
                <!-- Repeat for each affected file -->
            </affected_files>
            <steps>
                <step>[Detailed step for implementation]</step>
                <!-- Repeat for each step -->
            </steps>
            <dependencies>[Any dependencies on other tickets or components]</dependencies>
            <risks_and_challenges>[Potential risks or challenges]</risks_and_challenges>
            <estimated_complexity>[Low/Medium/High - use the Task's estimated complexity]</estimated_complexity>
            <priority>[High/Medium/Low]</priority>
            <effort>[Estimated hours or story points]</effort>
        </ticket>
        <!-- Repeat <ticket> structure for each Task in the DetailedTask -->
    </tickets>
</jira_items>
<response_format_instructions>

Now, using the provided code snippets, tdd context, and detailed task, generate Jira epic and tickets in the specified XML format.
`;
    }
    protected handleResponse(response: string): JiraItems {
        const options = {
            ignoreAttributes: true,
            parseTagValue: true,
            isArray: (name: any) =>
                ["component", "file", "step", "input", "output", "ticket"].includes(name),
        };

        // extract the jira_items block
        const match = response.match(/<jira_items>[\s\S]*<\/jira_items>/);
        const matchedBlock = match ? match[0] : "";

        // Parse the response into an intermediate format
        const parsedData = this.responseParser.parse(matchedBlock, options) as any;
        const result = parsedData.jira_items;

        return {
            epic: {
                title: result.epic.title,
                description: result.epic.description,
                technicalDetails: result.epic.technical_details,
                estimatedComplexity: result.epic.estimated_complexity,
                affectedComponents: result.epic.affected_components.component,
            },
            tickets: result.tickets.ticket.map((ticket: any) => ({
                title: ticket.title,
                description: ticket.description,
                technicalDetails: ticket.technical_details,
                affectedFiles: ticket.affected_files.file,
                steps: ticket.steps.step,
                dependencies: ticket.dependencies,
                risksAndChallenges: ticket.risks_and_challenges,
                estimatedComplexity: ticket.estimated_complexity,
                priority: ticket.priority,
                effort: ticket.effort,
            })),
        };
    }
}
