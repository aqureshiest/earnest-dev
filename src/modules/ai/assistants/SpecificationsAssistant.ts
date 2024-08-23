import { CODEFILES_PLACEHOLDER, TASK_PLACEHOLDER } from "@/constants";
import { BaseAssistant } from "./BaseAssistant";
import { PromptBuilder } from "../support/PromptBuilder";
import { ResponseParser } from "../support/ResponseParser";
import { TokenLimiter } from "../support/TokenLimiter";

export class SpecificationsAssistant extends BaseAssistant<Specifications> {
    constructor() {
        super(new PromptBuilder(), new TokenLimiter(), new ResponseParser<Specifications>());
    }

    getSystemPrompt(): string {
        return `
You are a senior software engineer working on a project. 
Your task is to generate specifications for implementing a specific coding task based on 
the provided task description, existing code files and response format instructions.

### Objective:
Analyze the task and the existing codebase, and provide clear, actionable specifications that 
outline the best technical approach for implementation. These specifications will guide the 
creation of a detailed implementation plan.

Each specification should include:
- a title.
- a thoughts section for you to use as scratchpath for your thoughts.
- list of key steps to follow.

### Considerations:
- Factor in the broader context of the codebase, such as design patterns, conventions, and dependencies, without deviating from the specific task.
- Ensure your specifications are detailed enough to be actionable but avoid being too high-level or abstract.
- Ignore unrelated improvements or optimizations that are not directly related to the task at hand.

### Constraints:
Your specifications should **NOT**:
- Include specific code examples or implementation details.
- Be overly abstract or general.
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

### Response Format:
Respond in the following YAML format:

\`\`\`yaml
specifications:
  - title: "Title of the specification"
    thoughts: "Placeholder for your thoughts on this specification"
    keySteps:
        - "Step 1"
        - "Step 2"
  - title: "Title of the specification"
    thoughts: "Placeholder for your thoughts on this specification
    specification: "A detailed specification."
\`\`\`

Now, using the task description and the existing code files, provide detailed specifications for the task in the specified YAML format.
`;
    }
}
