import { GenerateCodeV2 } from "@/modules/ai/GenerateCodeV2";
import { ToolRequest, ToolResponse } from "@/types/executor";
import { BaseTool } from "./BaseTool";

interface CodingToolParameters {
    owner: string;
    repo: string;
    branch: string;
}

/**
 * A tool that generates code based on a task description
 */
export class CodingTool extends BaseTool {
    public name: string = "code";
    public description: string = "Generates code based on a task description";
    public parameters: CodingToolParameters;

    private codeGenerator: GenerateCodeV2;

    constructor(parameters: CodingToolParameters) {
        super();
        this.parameters = parameters;
        this.codeGenerator = new GenerateCodeV2();
    }

    protected async executeImpl(request: ToolRequest): Promise<ToolResponse> {
        const { requestId, input } = request;

        try {
            // Build task request using the existing code generation service
            const taskRequest: CodingTaskRequest = {
                taskId: requestId,
                owner: this.parameters.owner,
                repo: this.parameters.repo,
                branch: this.parameters.branch,
                task: input,
                model: request.parameters?.model || "claude-3-7-sonnet-20240219",
                files: [],
                params: {},
            };

            // Process using the existing code generation service
            const result = await this.codeGenerator.runWorkflow(taskRequest);

            if (!result || !result.response) {
                throw new Error("No response from code generation service");
            }

            // Format the response
            const codeChanges = result.response;
            const formattedResponse = this.formatCodeChanges(codeChanges);

            return {
                requestId,
                content: formattedResponse,
                status: "success",
                metadata: {
                    newFiles: codeChanges.newFiles.length,
                    modifiedFiles: codeChanges.modifiedFiles.length,
                    deletedFiles: codeChanges.deletedFiles.length,
                    cost: result.cost,
                },
            };
        } catch (error) {
            console.error("Error in coding tool:", error);

            return {
                requestId,
                content: `Failed to generate code for: "${input}". ${
                    error instanceof Error ? error.message : "Unknown error"
                }`,
                status: "error",
            };
        }
    }

    private formatCodeChanges(codeChanges: CodeChanges): string {
        let response = `# ${codeChanges.title}\n\n`;

        // Add new files
        if (codeChanges.newFiles.length > 0) {
            response += "## New Files\n\n";

            for (const file of codeChanges.newFiles) {
                response += `### ${file.path}\n`;
                response += `${file.thoughts}\n\n`;
                response += "```\n";
                response += file.content;
                response += "\n```\n\n";
            }
        }

        // Add modified files
        if (codeChanges.modifiedFiles.length > 0) {
            response += "## Modified Files\n\n";

            for (const file of codeChanges.modifiedFiles) {
                response += `### ${file.path}\n`;
                response += `${file.thoughts}\n\n`;
                response += "```\n";
                response += file.content;
                response += "\n```\n\n";
            }
        }

        // Add deleted files
        if (codeChanges.deletedFiles.length > 0) {
            response += "## Deleted Files\n\n";

            for (const file of codeChanges.deletedFiles) {
                response += `- ${file.path}\n`;
            }
        }

        return response;
    }
}
