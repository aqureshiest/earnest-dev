import {
    CODEFILES_PLACEHOLDER,
    FEATURE_PLACEHOLDER,
    TECHNICAL_DESIGN_DOC_PLACEHOLDER,
} from "@/constants";
import { PromptBuilder } from "@/modules/ai/support/PromptBuilder";
import { ResponseParser } from "@/modules/ai/support/ResponseParser";
import { TokenLimiter } from "@/modules/ai/support/TokenLimiter";
import { CodebaseAssistant } from "../../CodebaseAssistant";

export class JiraTicketsAssistant extends CodebaseAssistant<JiraItems> {
    private responseParser: ResponseParser<JiraItems>;

    constructor() {
        super(new PromptBuilder(), new TokenLimiter());

        this.responseParser = new ResponseParser<JiraItems>();
    }

    getSystemPrompt(): string {
        return `
You are an expert software architect and project manager creating detailed Jira tickets for a software development project. Your goal is to create actionable, user-focused work items from a given Feature that developers can easily understand and implement.

<input>
You will receive:
1. A Feature from a Technical Design Document (TDD) analysis.
2. The complete TDD for reference. **Look for details on the Feature**.
3. Relevant code snippets from the existing codebase.
</input>

<output>
Produce:
1. A Jira Epic for the Feature
2. Detailed Jira tickets for each Task within the Feature

Epic and ticket details should follow the structure outlined in the <response_format> section.
</output>

<instructions>
- Analyze the Feature and the TDD.
- Examine provided code snippets.
- Create the Jira Epic based on the Feature, including a high-level user story.
- Generate detailed Jira tickets for each Task, each with a specific user story.
- Ensure tickets cover the entire scope of the Epic.
- Provide specific technical details for each ticket as outlined in the <response_format>. Focus on high-level explanations of what needs to be done rather than full code implementations. Use pseudo-code or short snippets only when necessary to illustrate complex logic.
- Consider dependencies and suggest implementation order.
- Include testing and documentation considerations in acceptance criteria.
- Use consistent naming conventions.
</instructions>

<considerations>
Frame all tasks in terms of user value, even for backend or database work.
Provide actionable, detailed technical specifications for immediate development.
Clearly state assumptions due to limited codebase access.
Ensure acceptance criteria are specific and testable.
</considerations>

<constraints>
Work with provided code snippets only. Clearly state assumptions.
Base suggestions on static analysis and expertise, not code execution.
Stick to the scope of the given Feature.
</constraints>

`;
    }
    getPrompt(params?: any): string {
        return `
Here are the relevant code snippets from the existing codebase:
<code_snippets>
${CODEFILES_PLACEHOLDER}
</code_snippets>

Here is the complete technical design document:
<technical_design_document>
${TECHNICAL_DESIGN_DOC_PLACEHOLDER}
</technical_design_document>

Here is the Feature you will be working on:
<feature>
${FEATURE_PLACEHOLDER}
</feature>

<response_format>
<jira_items>
    <epic>
        <title>[Feature name]</title>
        <user_story>As a [type of user], I want [an action] so that [benefit/value]</user_story>
        <description>[Refined epic description]</description>
        <technical_details>[Overall technical considerations]</technical_details>
        <affected_components>
            <component>[Affected component name]</component>
        </affected_components>
    </epic>
    <tickets>
        <ticket>
            <title>[Task name]</title>
            <user_story>As a [type of user], I want [an action] so that [benefit/value]</user_story>
            <acceptance_criteria>
                <criterion>[Specific, testable condition that must be met]</criterion>
            </acceptance_criteria>
            <description>[Detailed task description]</description>
            <technical_details>
<![CDATA[
[Provide a detailed, high-level explanation of the technical implementation without including full code snippets. Focus on:
- Architectural changes or new components
- Database modifications (table/column names, data types, constraints)
- API endpoint details (request/response structures, HTTP methods)
- Key algorithms or logic to be implemented
- Integration points with existing systems
- Performance considerations
- Security implications
Only include short code snippets if absolutely necessary to illustrate a critical point.]
]]>
            </technical_details>
            <affected_files>
                <file>[Affected file path]</file>
                <!-- Add more files as needed -->
            </affected_files>
            <steps>
                <step>[Detailed implementation step]</step>
                <!-- Add more steps as needed -->
            </steps>
            <dependencies>[Dependencies]</dependencies>
            <risks_and_challenges>[Risks or challenges]</risks_and_challenges>
            <estimated_complexity>[Task complexity]</estimated_complexity>
            <priority>[High/Medium/Low]</priority>
            <effort>[Estimated story points or hours]</effort>
            <effortIn>[story points/hours]</effortIn>
        </ticket>
        <!-- Add more tickets as needed -->
    </tickets>
</jira_items>
</response_format>

Now, Generate Jira epic and tickets in the specified XML format using the provided information. Be thorough and detailed in providing technical details.
`;
    }
    protected handleResponse(response: string): JiraItems {
        const options = {
            ignoreAttributes: false,
            attributeNamePrefix: "",
            isArray: (name: string, jpath: string) => {
                return ["ticket", "component", "criterion", "file", "step"].includes(name);
            },
        };

        // extract the jira_items block
        const match = response.match(/<jira_items>[\s\S]*<\/jira_items>/);
        const matchedBlock = match ? match[0] : "";

        if (!matchedBlock) {
            throw new Error("Invalid response format");
        }

        // Parse the response into an intermediate format
        const parsedData = this.responseParser.parse(matchedBlock, options) as any;

        return parsedData.jira_items as JiraItems;
    }
}
