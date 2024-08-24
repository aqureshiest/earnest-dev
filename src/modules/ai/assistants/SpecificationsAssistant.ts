import { CODEFILES_PLACEHOLDER, TASK_PLACEHOLDER } from "@/constants";
import { BaseAssistant } from "./BaseAssistant";
import { PromptBuilder } from "../support/PromptBuilder";
import { ResponseParser } from "../support/ResponseParser";
import { TokenLimiter } from "../support/TokenLimiter";

export class SpecificationsAssistant extends BaseAssistant<Specifications> {
    private responseParser: ResponseParser<Specifications>;

    constructor() {
        super(new PromptBuilder(), new TokenLimiter());

        this.responseParser = new ResponseParser<Specifications>();
    }

    override getSystemPrompt(): string {
        return `
You are a senior software engineer working on a project. 
Your task is to generate specifications for implementing a coding task based on 
the provided task_description, existing_codebase and response_format instructions.

<objective>
Analyze the task_description and the existing_codebase, and provide clear, actionable specifications that 
outline the best technical approach for implementation. These specifications will guide the 
creation of a detailed implementation plan.
</objective>

<instructions>

<summary>
Each specification should include:
- a title.
- a thoughts section for you to use as scratchpath for your thoughts.
- list of key steps to follow.
</summary>

<considerations>
- Factor in the broader context of the codebase, such as design patterns, conventions, and dependencies, without deviating from the specific task.
- Ensure your specifications are detailed enough to be actionable but avoid being too high-level or abstract.
- Ignore unrelated improvements or optimizations that are not directly related to the task at hand.
</considerations>

<constraints>
Your specifications should NOT:
- Include specific code examples or implementation details.
- Be overly abstract or general.
- Include work that is already done.
</constraints>

</instructions>

`;
    }

    override getPrompt(params: any | null): string {
        return `
Here are the existing code files you will be working with:
<existing_codebase>
${CODEFILES_PLACEHOLDER}
</existing_codebase>


Here is the task description:
<task_description>
${TASK_PLACEHOLDER}
</task_description>

Respond in the following format:
<response_format>

<specifications>
 <specification>
  <title>A brief title</title>
  <thoughts>your thoughts on this specification</thoughts>
  <key_steps>
   <step>step 1</step>
   <step>step 2</step>            
  </key_steps>        
 </specification>
 <!-- Add more <specification> elements if needed -->
</specifications>

</response_format>

Now, using the task description and the existing code files, provide detailed specifications for the task in the specified XML format.
`;
    }

    handleResponse(model: string, task: string, response: string): Specifications {
        const options = {
            ignoreAttributes: false,
            isArray: (name: any, jpath: any) => name === "specification" || name === "step", // || name === "consideration"
        };

        // Parse the response into an intermediate format
        const parsedData = this.responseParser.parse(
            model,
            task,
            this.constructor.name,
            response,
            options
        ) as any;

        // Flatten the data into the final format
        const specifications: Specifications = parsedData.specifications.specification.map(
            (spec: any) => ({
                title: spec.title,
                summary: spec.thoughts,
                key_steps: Array.isArray(spec.key_steps?.step)
                    ? spec.key_steps.step
                    : [spec.key_steps.step],
                // considerations: Array.isArray(spec.considerations?.consideration)
                //     ? spec.considerations.consideration
                //     : [spec.considerations.consideration],
            })
        );

        return specifications;
    }
}
