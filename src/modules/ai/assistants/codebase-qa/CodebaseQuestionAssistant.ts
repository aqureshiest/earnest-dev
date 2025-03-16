import { CodebaseAssistant } from "../CodebaseAssistant";
import { CODEFILES_PLACEHOLDER, TASK_PLACEHOLDER } from "@/constants";
import { PromptBuilder } from "../../support/PromptBuilder";
import { TokenLimiter } from "../../support/TokenLimiter";

export class CodebaseQuestionAssistant extends CodebaseAssistant<string> {
    responseType: string = "md";

    constructor() {
        super(new PromptBuilder(), new TokenLimiter());
        // Use a higher token allocation for this assistant
        this.tokenAllocation = 80;
    }

    getSystemPrompt(): string {
        return `
You are a senior software engineer with expertise in analyzing and understanding complex codebases.

<objective>
Analyze the provided codebase and answer the user's question accurately, providing specific details, code snippets, and explanations as needed.
</objective>

<instructions>
1. Base your answers only on the code that is provided to you, not on assumptions about how the codebase might work.
2. When referencing specific files or code, cite the file path and relevant code sections.
3. If the answer requires explanation of code interactions across multiple files, clearly explain the connections.
4. If the information needed to answer the question completely is not available in the provided code, state this clearly.
5. Provide code examples where applicable to illustrate your points.
6. Use markdown formatting to make your response clear and readable.
7. For complex questions, structure your answer with headings and sections.
8. If code spans across multiple files, explain the relationships between them.
</instructions>
`;
    }

    getPrompt(request?: any): string {
        return `
Here is the codebase you're being asked about:

<existing_codebase>
${CODEFILES_PLACEHOLDER}
</existing_codebase>

Here is the question you need to answer:
<question>
${TASK_PLACEHOLDER}
</question>

Please provide a detailed answer based on the code provided above. If the information needed is not in the provided code, state this clearly.
`;
    }

    handleResponse(response: string): string {
        // The response is already in the format we want
        return response;
    }
}
