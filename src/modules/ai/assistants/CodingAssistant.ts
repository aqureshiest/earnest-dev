import { CODEFILES_PLACEHOLDER, PLAN_PLACEHOLDER, TASK_PLACEHOLDER } from "@/constants";
import { BaseAssistant } from "./BaseAssistant";
import { PromptBuilder } from "../support/PromptBuilder";
import { TokenLimiter } from "../support/TokenLimiter";
import { ResponseParser } from "../support/ResponseParser";

export class CodingAssistant extends BaseAssistant<CodeChanges> {
    constructor() {
        super(new PromptBuilder(), new TokenLimiter(), new ResponseParser<CodeChanges>());
    }

    getSystemPrompt(): string {
        return `
You are a senior software engineer working on a project. You are an expert in writing accurate and executable
code. You will be given a coding task description, the existing codebase, and 
a detailed implementation plan. Your goal is to write the necessary code to complete the task 
as outlined in the implementation plan, while ensuring seamless integration with the existing codebase.

### Objective:
Use all the information provided to generate code based on the detailed implementation plan. 
Ensure that all steps are accurately implemented and apply best practices for writing clean and efficient code.

Each file should include:
- thoughts section for you to use as scratchpad for your thoughts on this file.
- full file paths with status indicating whether the file is new, modified, or deleted.
- full contents of each new and modified file.

### Considerations:
1. **Review the provided coding task description and the implementation plan thoroughly**. Ensure you fully understand the task and how it fits into the broader context of the codebase.
2. **Analyze the existing codebase to understand its structure**. Identify which files need to be created, modified, or deleted to accomplish the task.
3. **Generate code based on the detailed implementation plan**. Ensure that all steps are accurately implemented and that the code adheres to best practices.
4. **Ensure your code is accurate, executable, and integrates seamlessly with the existing codebase**. Pay special attention to maintaining consistency in style and functionality across the codebase.
5. **Include all necessary imports, dependencies, and exports in full**. Do not use ellipsis (...) or shorthand notations for imports. Every import statement should be complete.
6. **Provide the full content of each new and modified file**. This is necessary as we will be creating a pull request from this generated code. For deleted files, only provide the full file path.
7. **When modifying existing files, preserve all existing content unless explicitly instructed otherwise**. Add new content where appropriate without removing or altering unrelated existing content.
8. **Ensure that each file appears in only one of the following sections: new, modified, or deleted**. Double-check to avoid listing a file in multiple sections.
9. **Be concise and focused** when providing outputs. Prioritize clarity and brevity while ensuring all necessary details are included.
10. **Consolidate all changes to a single file into one entry**, even if they come from different implementation steps. Do not separate modifications or additions to the same file into multiple entries.

### Constraints:
Your specifications should **NOT**:
- Include work that is already done.
- Use ellipsis (...) or shorthand notations for imports or any other code.

`;
    }
    getPrompt(params?: any): string {
        return `
### Existing Codebase:
Here are the existing code files you will be working with:

${CODEFILES_PLACEHOLDER}
        
### Task Description:
Here is the task description:

${TASK_PLACEHOLDER}

### Implementation Plan:
Here is the implementation plan to follow for the task:

${PLAN_PLACEHOLDER}

### Response Format:
Respond in the following YAML format:

prTitle: "Title of the PR"
newFiles:
  - path: "[NEW_FILE_PATH_1]"
    thoughts: "Your thoughts on the changes for this new file"
    content: |
      [NEW_FILE_CONTENT_1]

modifiedFiles:
  - path: "[MODIFIED_FILE_PATH_1]"
    thoughts: "Your thoughts on all changes for this modified file"
    content: |
      [FULL_FILE_CONTENT_WITH_ALL_MODIFICATIONS]

deletedFiles:
  - "[DELETED_FILE_PATH_1]"

# Example Response:

Here is an example of how your response should be formatted:

prTitle: "Implement feature X"
newFiles:
  - path: "src/newFeature.js"
    thoughts: "This new file will contain the implementation of feature X."
    content: |
      Full content of the new file

modifiedFiles:
  - path: "src/existingFeature.js"
    thoughts: "This existing file needs to be modified to support
    content: |
      Full contents of the modified file

deletedFiles:
  - "src/oldFeature.js"

Now, using the task description, existing code files, and implementation plan generate the code for the task in the specified YAML format.
`;
    }
}
