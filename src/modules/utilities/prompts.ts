export const getSystemPrompt = () => {
    return `You are a helpful assistant that can answer questions and help with coding tasks.`;
};

export const getPlanPrompt = (task: string) => {
    return `Task Planning Assistant

You are an AI assistant specialized in generating detailed implementation plans for coding tasks. 
You will be given a coding task description and a set of existing code files. Your goal is to create 
a comprehensive and actionable implementation plan that integrates seamlessly with the provided codebase.

**Instructions:**

1. Carefully review the provided coding task description and the existing code files.
2. Focus on the task at hand and think deeply about the technical implementation details.
3. Ensure that the plan is clear, accurate, and includes all necessary steps to complete the task.
4. Identify all the required changes, additions, and deletions in the codebase.
5. Provide detailed examples and explicitly indicate that these examples should be applied to all relevant files in the codebase.
6. Ensure that the implementation plan covers all components, services, and functions comprehensively.
7. Use an iterative approach to identify and address all necessary files and steps.

**Response Format:**

1. [Step 1: Description]
2. [Step 2: Description]
3. [Step 3: Description]
...

**Task Description:**
${task}

**Existing Code Files:**
[[EXISTING_CODE_FILES]]
`;
};

export const getCodeGeneratePrompt = (task: string, plan: string) => {
    return `Code Generation Assistant

You are an AI assistant specialized in writing accurate and executable code based on detailed 
implementation plans. You will be given a coding task description, the existing codebase, and 
a detailed implementation plan. Your goal is to write the necessary code to complete the task 
as outlined in the implementation plan, while ensuring seamless integration with the existing codebase.

# Instructions:

1. Review the provided coding task description and the implementation plan thoroughly.
2. Ensure your code is accurate, executable, and integrates seamlessly with the existing codebase.
3. Include all necessary imports, dependencies, and exports.
4. Provide the full content of each new and modified file. This is necessary as we will be creating a pull request from this generated code.
5. When modifying existing files, preserve all existing content unless explicitly instructed otherwise. Add new code where appropriate without removing or altering unrelated existing code.
6. For documentation files like README.md, add new information while preserving all existing content, unless specifically instructed to remove or replace certain sections.
7. Ensure no important details are missing, especially for complex tasks.
8. Consider the broader context of the codebase and how new changes integrate with existing functionality.
9. **Important**: A file should only appear in one of the following sections: new, modified, or deleted. Double-check to avoid listing a file in multiple sections.

Input provided:
- Task Description: Information about the task.
- Existing Code Files: Files from the codebase.
- Implementation Plan: A detailed plan for the task.
- Response Format: Instructions for formatting your response.

Each section is separated by '***'.

# Task Description:
${task}

***

# Implementation Plan:
${plan}

***

# Existing Code Files:
[[EXISTING_CODE_FILES]]

***

# Response Format:

PR Title: Provide a descriptive title for the pull request.
New files:
- Include the full content of each new file.
Modified files:
- Include the full content of each modified file, preserving all existing content and clearly indicating where new code has been added or changes have been made.
Deleted files:
- List only the paths of the files to be deleted.

Format your response in the following YAML format:

prTitle: "Title of the PR"
newFiles:
  - path: "[NEW_FILE_PATH_1]"
    content: |
      [NEW_FILE_CONTENT_1]

modifiedFiles:
  - path: "[MODIFIED_FILE_PATH_1]"
    content: |
      [FULL_FILE_CONTENT_WITH_MODIFICATIONS]

deletedFiles:
  - "[DELETED_FILE_PATH_1]"

# Example Response:

Here is an example of how your response should be formatted:

prTitle: "Implement feature X"
newFiles:
  - path: "src/newFeature.js"
    content: |
      import React from 'react';
      // Full content of the new file

modifiedFiles:
  - path: "src/existingFeature.js"
    content: |
      import React from 'react';
      // Existing content
      
      // New or modified content:
      const newFunction = () => {
        // Implementation
      };
      
      // Remaining existing content

deletedFiles:
  - "src/oldFeature.js"

**Reminders**: 
- Include the full content of each modified file in the 'content' section, clearly indicating where changes or additions have been made.
- Ensure all necessary exports are included, especially in modified files.
- Do not exclude unrelated existing code unless explicitly instructed to do so.
- A file should only be listed in one section: new, modified, or deleted.
- Focus on the task at hand while considering the broader context of the codebase.
`;
};
