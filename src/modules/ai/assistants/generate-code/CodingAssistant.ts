import { CODEFILES_PLACEHOLDER, PLAN_PLACEHOLDER, TASK_PLACEHOLDER } from "@/constants";
import { CodebaseAssistant } from "@/modules/ai/assistants/CodebaseAssistant";
import { ResponseParser } from "@/modules/ai/support/ResponseParser";
import { PromptBuilder } from "@/modules/ai/support/PromptBuilder";
import { TokenLimiter } from "@/modules/ai/support/TokenLimiter";

export class CodingAssistant extends CodebaseAssistant<CodeChanges> {
    constructor() {
        super(new PromptBuilder(), new TokenLimiter());
    }

    getSystemPrompt(): string {
        return `
You are a senior software engineer working on a project. You are an expert in writing accurate and executable code. You will be given a coding task_description, the existing_codebase, and a detailed implementation_plan. Your goal is to write the necessary code to complete the task as outlined in the implementation_plan, while ensuring seamless integration with the existing_codebase.

<objective>
Use all the information provided to generate code based on the detailed implementation_plan.  Ensure that all steps are accurately implemented and apply best practices for writing clean and efficient code.
</objective>

<instructions>

<summary>
Each file should include:
- thoughts section for you to use as scratchpad for your thoughts on this file.
- full file paths with status indicating whether the file is new, modified, or deleted.
- full contents of each new and modified file.
</summary>

<considerations>
1. **Provide the full content of each new and modified file, including ALL existing code**. This is critical as we will be creating a pull request from this generated code. For deleted files, only provide the full file path.
2. **When modifying existing files, include the entire file content**. Add new content where appropriate without removing or altering unrelated existing content. Do not use ellipses (...) or any shorthand notations to represent existing code.
3. **Review the provided coding task description and the implementation plan thoroughly**. Ensure you fully understand the task and how it fits into the broader context of the codebase.
4. **Analyze the existing codebase to understand its structure**. Identify which files need to be created, modified, or deleted to accomplish the task.
5. **Generate code based on the detailed implementation plan**. Ensure that all steps are accurately implemented and that the code adheres to best practices.
6. **Ensure your code is accurate, executable, and integrates seamlessly with the existing codebase**. Pay special attention to maintaining consistency in style and functionality across the codebase.
7. **Ensure that each file appears in only one of the following sections: new, modified, or deleted**. Double-check to avoid listing a file in multiple sections.
8. **Be thorough and complete** when providing outputs. Prioritize including all necessary code while maintaining clarity.
9. **Consolidate all changes to a single file into one entry**, even if they come from different implementation steps. Do not separate modifications or additions to the same file into multiple entries.
</considerations>

<constraints>
Your specifications should **NOT**:
- Omit any existing code when modifying files.
- Use ellipsis (...) or any shorthand notations for existing code.
- Include work that is already done without explicitly showing it in full.
</constraints>

</instructions>

`;
    }
    getPrompt(params?: any): string {
        return `
Here are the existing code files you will be working with:
<existing_codebase language="typescript">
${CODEFILES_PLACEHOLDER}
</existing_codebase>
        
Here is the task description:
<task_description>
${TASK_PLACEHOLDER}
</task_description>

Here is the implementation plan to follow for the task:
${PLAN_PLACEHOLDER}

<response_format_instructions>
Respond in the following format:

<code_changes>
 <title>Title of the PR</title>
 <new_files>
  <file>
  <path>path/to/new/file1</path>
  <thoughts>Thoughts on the creation of this new file</thoughts>
  <content>
<![CDATA[
// Full content of the new file goes here 
]]>
  </content>
  </file>
  <!-- Add more new files as needed -->        
 </new_files>
 <modified_files>
  <file>
  <path>path/to/modified/file1</path>
  <thoughts>Thoughts on the modifications made to this file</thoughts>
  <content>
<![CDATA[
// Full content of the modified file goes here, including all changes 
]]>
  </content>
  </file>
  <!-- Add more modified files as needed -->
 </modified_files>
 <deleted_files>
  <file>
   <path>path/to/deleted/file1</path>
  </file>
  <!-- Add more deleted files as needed -->
 </deleted_files>
</code_changes>

</response_format_instructions>

Now, using the task description, existing code files, and implementation plan generate the code for the task in the specified XML format.
`;
    }

    handleResponse(response: string): CodeChanges {
        return CodingAssistant.parseResponseToCodeChanges(response);
    }

    static parseResponseToCodeChanges(response: string): CodeChanges {
        const responseParser = new ResponseParser<CodeChanges>();

        const options = {
            ignoreAttributes: false,
            isArray: (name: any, jpath: any) => name === "file",
        };

        // extract the code_changes block
        const match = response.match(/<code_changes>[\s\S]*<\/code_changes>/);
        const codeChangesBlock = match ? match[0] : "";

        // Parse the response into an intermediate format
        const parsedData = responseParser.parse(codeChangesBlock, options) as any;

        try {
            // Normalize the parsed data
            const codeChanges: CodeChanges = {
                title: parsedData.code_changes.title,
                newFiles:
                    parsedData.code_changes.new_files?.file?.map((file: any) => ({
                        path: file.path,
                        thoughts: file.thoughts,
                        content: file.content.trim(),
                    })) || [],
                modifiedFiles:
                    parsedData.code_changes.modified_files?.file?.map((file: any) => ({
                        path: file.path,
                        thoughts: file.thoughts,
                        content: file.content.trim(),
                    })) || [],
                deletedFiles:
                    parsedData.code_changes.deleted_files?.file?.map((file: any) => ({
                        path: file.path,
                    })) || [],
            };

            return codeChanges;
        } catch (error: any) {
            console.error("Error parsing code", error);
            console.error("Parsed data", JSON.stringify(parsedData, null, 2));
            throw new Error(error);
        }
    }
}
