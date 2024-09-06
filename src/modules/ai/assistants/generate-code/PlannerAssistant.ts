import { CODEFILES_PLACEHOLDER, SPECS_PLACEHOLDER, TASK_PLACEHOLDER } from "@/constants";
import { BaseAssistant } from "../BaseAssistant";
import { PromptBuilder } from "@/modules/ai/support/PromptBuilder";
import { TokenLimiter } from "@/modules/ai/support/TokenLimiter";
import { ResponseParser } from "@/modules/ai/support/ResponseParser";

export class PlannerAssistant extends BaseAssistant<ImplementationPlan> {
    private responseParser: ResponseParser<ImplementationPlan>;

    constructor() {
        super(new PromptBuilder(), new TokenLimiter());

        this.responseParser = new ResponseParser<ImplementationPlan>();
    }

    getSystemPrompt(): string {
        return `
You are a senior software engineer working on a project. 
Your task is to generate a detailed implementation plan for a coding task based on
the provided task_description, existing_codebase, specifications for the task, 
and response_format instructions.

<objective>
Analyze the provided information to create a comprehensive and actionable implementation plan that
outlines the best technical approach for implementation. This plan will guide the creation of the actual code.
</objective>

<instructions>

<summary>
Each step in the implementation plan should include:
- a brief title
- thoughts section for you to use as scratchpad for your thoughts on this step.
- full file paths with operation indicating whether the file should be new, modify, or delete.
- a list of todos for the file
</summary>

<considerations>
- Carefully review the provided coding task description, existing code files, and the specifications.
- Focus on the task at hand and think deeply about the technical implementation details.
- Provide a clear, accurate, and comprehensive plan that covers all necessary steps to complete the task.
- Address all requirements specified in the task and the specifications.
- Ensure that the plan is clear, accurate, and includes all necessary steps to complete the task.
- Use an iterative approach to identify and address all necessary files and steps.
</considerations>

<constraints>
Your specifications should **NOT**:
- Include work that is already done.
</constraints>

</instructions>

`;
    }

    getPrompt(params: any | null): string {
        return `
Here are the existing code files you will be working with:
<existing_codebase>
${CODEFILES_PLACEHOLDER}
</existing_codebase>
        
Here is the task description:
<task_description>
${TASK_PLACEHOLDER}
</task_description>

Here are the detailed specifications for the task:
${SPECS_PLACEHOLDER}

<response_format_instructions>
Respond in the following format:

<implementation_plan>
 <step>
  <title>A brief title</title>
  <thoughts>Your thoughts on this step</thoughts>
  <files>
   <file>
    <path>path/to/file</path>
    <operation>modify</operation> <!-- 'new', 'modify', 'delete' -->        
    <todos>
     <todo>Todo 1</todo>
     <todo>Todo 2</todo>
    </todos>
   </file>
   <!-- Add more <file> elements if needed -->
  </files>
 </step>
 <!-- Add more <step> elements if needed -->
</implementation_plan>

</response_format_instructions>

Now, using the task description, existing code files, and specifications generate a detailed implementation plan for the task in the specified XML format.
`;
    }

    handleResponse(model: string, task: string, response: string): ImplementationPlan {
        const options = {
            ignoreAttributes: false,
            isArray: (name: any, jpath: any) =>
                name === "step" || name === "file" || name === "todo",
        };

        // extract the code_changes block
        const match = response.match(/<implementation_plan>[\s\S]*<\/implementation_plan>/);
        const matchedBlock = match ? match[0] : "";

        // Parse the response into an intermediate format
        const parsedData = this.responseParser.parse(
            model,
            task,
            this.constructor.name,
            matchedBlock,
            options
        ) as any;

        try {
            const plan: ImplementationPlan = {
                steps: parsedData.implementation_plan.step.map((step: any) => ({
                    title: step.title,
                    thoughts: step.thoughts,
                    files:
                        step.files.file?.map((file: any) => ({
                            path: file.path,
                            operation: file.operation,
                            todos: file.todos.todo,
                        })) || [],
                })),
            };

            return plan;
        } catch (error: any) {
            console.error("Error parsing implementation plan", error);
            console.error("Parsed data", JSON.stringify(parsedData, null, 2));
            throw new Error(error);
        }
    }
}
