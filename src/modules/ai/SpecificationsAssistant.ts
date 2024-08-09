import { BaseAssistant } from "./BaseAssistant";

export class SpecificationsAssistant extends BaseAssistant<Specifications> {
    constructor() {
        super();
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
- a detailed specification.

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

[[EXISTINGCODEFILES]]

### Task Description:
Here is the task description:

[[TASKDESCRIPTION]]

### Response Format:
Respond in the following YAML format:

\`\`\`yaml
specifications:
  - title: "Title of the specification"
    thoughts: "Placeholder for your thoughts on this specification"
    specification: "A detailed specification."
  - title: "Title of the specification"
    thoughts: "Placeholder for your thoughts on this specification
    specification: "A detailed specification."
\`\`\`

Now, using the task description and the existing code files, provide detailed specifications for the task in the specified YAML format.
`;
    }
}
