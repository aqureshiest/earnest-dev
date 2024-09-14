import { CODEFILES_PLACEHOLDER } from "@/constants";
import { PromptBuilder } from "../support/PromptBuilder";
import { ResponseParser } from "../support/ResponseParser";
import { TokenLimiter } from "../support/TokenLimiter";
import { CodebaseChunksAssistant } from "./CodebaseChunksAssistant";

export class CodeAnalyzer extends CodebaseChunksAssistant<string> {
    private responseParser: ResponseParser<string>;

    constructor() {
        super(new PromptBuilder(), new TokenLimiter());

        this.responseParser = new ResponseParser<string>();
    }

    override getSystemPrompt(): string {
        return `
You are a highly skilled senior software engineer tasked with analyzing a large codebase and a technical design 
document for a project. Your job is to break down the desired functionality into clear, actionable, and specific 
tasks, focusing on the exact changes required in the current codebase to achieve the functionality outlined in 
the design document.

<objective>
Your goal is to analyze the codebase and technical design document, and generate granular, specific tasks 
that align with the current state of the code. Each task should outline necessary changes, additions, or 
refactoring to ensure the features in the technical design document are fully implemented. Include priorities, 
dependencies, and expected effort for each task.
</objective>

<instructions>	

<summary>
Each task should include:
- A clear and concise title.
- A detailed explanation of the changes or work required, including the overall goal of the task.
- A list of specific code files and broader components or modules that need to be modified or created.
- An ordered list of granular steps to follow to complete the task, ensuring they are logically sequenced and precise.
- Any dependencies or external factors that must be resolved before the task can be completed.
- A list of inputs (e.g., design document sections or resources) needed to complete the task and outputs (e.g., expected deliverables).
- The task's priority and an estimate of the effort required to complete it.
</summary>

<considerations>
- Focus on tasks that are directly related to the functionality described in the technical design document, ensuring each task fits within the existing architecture, design patterns, and code conventions.
- Ensure that tasks are actionable, detailed, and avoid generalizations. Each task should correspond to specific changes in the codebase.
- Consider interdependencies between tasks and note any that need to be done in a specific sequence.
- Take into account the priority of each task and estimate the effort required to complete it.
- Avoid unnecessary optimizations or improvements that do not contribute directly to the functionality described.
</considerations>

<constraints>
Your tasks should NOT:
- Include specific code snippets or overly detailed implementation instructions.
- Suggest high-level or abstract improvements without a clear, immediate relation to the current project requirements.
- List work that is already completed in the codebase.
</constraints>

</instructions>
`;
    }

    override getPrompt(params: any | null): string {
        return `
Here are the existing code files and technical design document you will be working with:

Here is the existing codebase you will be working with:
<existing_codebase>
${CODEFILES_PLACEHOLDER}
</existing_codebase>

Here is the technical design document:
<technical_design_document>
[[DESIGN_DOC_PLACEHOLDER]]
</technical_design_document>

<response_format_instructions>
Respond in the following format:
    <tasks>
        <task>
            <title>A brief title</title>
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
                <step>step 1</step>
                <step>step 2</step>
                <!-- Add more steps as needed -->
            </steps>
            <dependencies>
                <dependency>Any related task or external factor</dependency>
                <!-- Add more <dependency> elements if applicable -->
            </dependencies>
            <inputs>
                <input>Required design document section or external resource</input>
                <!-- Add more <input> elements if applicable -->
            </inputs>
            <outputs>
                <output>Expected deliverable, such as a new function or module</output>
                <!-- Add more <output> elements if applicable -->
            </outputs>
            <priority>high | medium | low</priority>
            <effort>Estimate the effort needed for the task (e.g., hours or complexity)</effort>
        </task>
        <!-- Add more <task> elements if needed -->
    </tasks>
</response_format_instructions>

Now, using the codebase and the technical design document, break down the project into a set of specific tasks that align with the existing structure and needs of the project.

`;
    }

    process(request: CodingTaskRequest): Promise<AIAssistantResponse<string> | null> {
        throw new Error("Method not implemented.");
    }

    protected handleResponse(response: string): string {
        // extract the tasks block
        const match = response.match(/<tasks>[\s\S]*<\/tasks>/);
        const matchedBlock = match ? match[0] : "";

        // Parse the response into an intermediate format
        const parsedData = this.responseParser.parse(matchedBlock) as any;

        return response;
    }
}
