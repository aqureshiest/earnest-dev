import { CODEFILES_PLACEHOLDER, SPECS_PLACEHOLDER, TASK_PLACEHOLDER } from "@/constants";
import { BaseAssistant } from "./BaseAssistant";
import { PromptBuilder } from "../support/PromptBuilder";
import { ResponseParser } from "../support/ResponseParser";
import { TokenLimiter } from "../support/TokenLimiter";

export class PlannerAssistant extends BaseAssistant<ImplementationPlan> {
    constructor() {
        super(new PromptBuilder(), new TokenLimiter(), new ResponseParser<ImplementationPlan>());
    }

    getSystemPrompt(): string {
        return `
You are a senior software engineer working on a project. 
Your task is to generate a detailed implementation plan for the given task based on
the provided task description, existing code files, detailed specifications for the task, 
and response format instructions.

### Objective:
Analyze the provided information to create a comprehensive and actionable implementation plan that
outlines the best technical approach for implementation. This plan will guide the creation of the actual code.

Each step in the implementation plan should include:
- a detailed description.
- thoughts section for you to use as scratchpad for your thoughts on this step.
- full file paths with status indicating whether the file is new, modified, or deleted.
- a list of todos for the file

### Considerations:
- Carefully review the provided coding task description, existing code files, and the specifications.
- Focus on the task at hand and think deeply about the technical implementation details.
- Provide a clear, accurate, and comprehensive plan that covers all necessary steps to complete the task.
- Address all requirements specified in the task and the specifications.
- Ensure that the plan is clear, accurate, and includes all necessary steps to complete the task.
- Use an iterative approach to identify and address all necessary files and steps.

### Constraints:
Your specifications should **NOT**:
- Include work that is already done.

`;
    }

    getPrompt(params: any | null): string {
        return `
### Existing Codebase:
Here are the existing code files you will be working with:

${CODEFILES_PLACEHOLDER}
        
### Task Description:
Here is the task description:

${TASK_PLACEHOLDER}

### Specifications:
Here are the detailed specifications for the task:

${SPECS_PLACEHOLDER}

### Response Format:
Respond in the following YAML format:

\`\`\`yaml
implementationPlan:
  - step: "A detailed description."
    thoughts: "Placeholder for your thoughts on this step."
    files:
      - path: "path/to/file"
        status: "new"
        todos: 
          - "Todo 1"
          - "Todo 2"
\`\`\`

Now, using the task description, existing code files, and specifications generate a detailed implementation plan for the task in the specified YAML format.
`;
    }
}
