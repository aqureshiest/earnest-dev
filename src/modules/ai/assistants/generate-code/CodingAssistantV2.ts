import { CODEFILES_PLACEHOLDER, PLAN_PLACEHOLDER, TASK_PLACEHOLDER } from "@/constants";
import { CodebaseAssistant } from "@/modules/ai/assistants/CodebaseAssistant";
import { PromptBuilder } from "@/modules/ai/support/PromptBuilder";
import { TokenLimiter } from "@/modules/ai/support/TokenLimiter";
import { RepositoryDataService } from "@/modules/db/RepositoryDataService";
import chalk from "chalk";
import { sendTaskUpdate } from "@/modules/utils/sendTaskUpdate";
import { formatXml } from "@/modules/utils/formatXml";
import { saveRunInfo } from "@/modules/utils/saveRunInfo";
import { PlannerAssistant } from "./PlannerAssistant";
import { CodingAssistant } from "./CodingAssistant";

export class CodingAssistantV2 extends CodebaseAssistant<CodeChanges> {
    private dataService: RepositoryDataService;

    constructor() {
        super(new PromptBuilder(), new TokenLimiter());
        this.dataService = new RepositoryDataService();
    }

    getSystemPrompt(): string {
        // use v1 system prompt
        return new CodingAssistant().getSystemPrompt();
    }

    async process(request: CodingTaskRequest): Promise<AIAssistantResponse<CodeChanges> | null> {
        const { model, task, taskId, files, params, owner, repo, branch } = request;

        console.log(
            `[${chalk.yellow(
                this.constructor.name
            )}] Processing task:\n>>${task}\n>>with model: ${model}`
        );

        // Parse the implementation plan from the request
        const implementationPlan = PlannerAssistant.parseResponseToPlan(params.implementationPlan);

        if (!implementationPlan || !implementationPlan.steps) {
            console.error("Failed to parse implementation plan or no steps found");
            return null;
        }

        const aggregatedResponse: CodeChanges = {
            title: "",
            newFiles: [],
            modifiedFiles: [],
            deletedFiles: [],
        };

        // Track total tokens and cost across files
        let totalInputTokens = 0;
        let totalOutputTokens = 0;
        let totalCost = 0;

        // Total number of files to process
        const totalFileCount = implementationPlan.steps.reduce(
            (count, step) => count + step.files.length,
            0
        );
        let processedFileCount = 0;

        // Process each file individually within each step
        for (const step of implementationPlan.steps) {
            console.log(`[${chalk.blue(this.constructor.name)}] Processing step: ${step.title}`);
            sendTaskUpdate(taskId, "progress", `Starting step: ${step.title}`);

            for (const fileChange of step.files) {
                processedFileCount++;
                const progressPercent = Math.round((processedFileCount / totalFileCount) * 100);

                console.log(
                    `[${chalk.green(
                        this.constructor.name
                    )}] Processing file (${processedFileCount}/${totalFileCount}): ${
                        fileChange.path
                    }`
                );
                sendTaskUpdate(
                    taskId,
                    "progress",
                    `Generating code for ${fileChange.path} (${progressPercent}%)`
                );

                // Prepare query for embedding search
                const fileQuery = this.createFileSearchQuery(fileChange, step);

                try {
                    // Get relevant files using embedding similarity
                    console.log(`Finding similar files for ${fileChange.path} using embeddings...`);

                    // Find similar files for this step and file change
                    const similarFiles = await this.dataService.findSimilar(
                        fileQuery,
                        owner,
                        repo,
                        branch
                    );

                    // keep relevant files as top 30 similar files
                    const relevantFiles = similarFiles.slice(0, 30);

                    // Check if we need to add target file for modification
                    if (fileChange.operation === "modify") {
                        const targetFile = files.find((f) => f.path === fileChange.path);
                        if (targetFile && !relevantFiles.some((f) => f.path === targetFile.path)) {
                            // Add target file at the beginning if it's not already included
                            relevantFiles.unshift(targetFile);
                            console.log(`Added target file ${fileChange.path} for modification`);
                        }
                    }

                    // Generate code using relevant files
                    await this.processFileWithRelevantContext(
                        request,
                        model,
                        step,
                        fileChange,
                        relevantFiles,
                        taskId,
                        aggregatedResponse,
                        totalInputTokens,
                        totalOutputTokens,
                        totalCost
                    );
                } catch (error) {
                    console.error(`Error finding similar files for ${fileChange.path}:`, error);
                    console.log(`Falling back to using all files for ${fileChange.path}`);

                    // Fallback: use all files but prioritize the target file
                    let allFilesWithPriority = [...files];

                    // If this is a modification, ensure the target file is first for context
                    if (fileChange.operation === "modify") {
                        const targetFileIndex = allFilesWithPriority.findIndex(
                            (f) => f.path === fileChange.path
                        );
                        if (targetFileIndex > 0) {
                            // Move target file to the beginning
                            const targetFile = allFilesWithPriority.splice(targetFileIndex, 1)[0];
                            allFilesWithPriority.unshift(targetFile);
                        }
                    }

                    // Process with all files as context (token limiter will handle pruning)
                    await this.processFileWithRelevantContext(
                        request,
                        model,
                        step,
                        fileChange,
                        allFilesWithPriority,
                        taskId,
                        aggregatedResponse,
                        totalInputTokens,
                        totalOutputTokens,
                        totalCost
                    );
                }
            }

            sendTaskUpdate(taskId, "progress", `Completed step: ${step.title}`);
        }

        // Make sure we have a title for the PR
        if (!aggregatedResponse.title) {
            aggregatedResponse.title = "Implementation of requested features";
        }

        // Format the aggregated response as XML
        const responseStr = formatXml(aggregatedResponse);

        const caller = this.constructor.name;
        saveRunInfo(request, caller, "ai_resp_aggr", responseStr);
        saveRunInfo(request, caller, "ai_resp_parsed_aggr", aggregatedResponse, this.responseType);

        // Create the final response object
        return {
            response: aggregatedResponse,
            responseStr: responseStr,
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            cost: totalCost,
            calculatedTokens: totalInputTokens + totalOutputTokens, // Approximation
        };
    }

    private async processFileWithRelevantContext(
        request: CodingTaskRequest,
        model: string,
        step: Step,
        fileChange: FileChanges,
        relevantFiles: FileDetails[],
        taskId: string,
        aggregatedResponse: CodeChanges,
        totalInputTokens: number,
        totalOutputTokens: number,
        totalCost: number
    ): Promise<void> {
        // Create a file-specific request with relevant context files
        const fileRequest: CodingTaskRequest = {
            ...request,
            files: relevantFiles,
        };

        // Generate code for this specific file
        const fileResponse = await this.generateSingleFileCode(
            model,
            fileRequest,
            step,
            fileChange
        );

        if (!fileResponse?.response) {
            console.error(`Failed to generate code for file: ${fileChange.path}`);
            sendTaskUpdate(taskId, "progress", `⚠️ Failed to generate code for ${fileChange.path}`);
            return;
        }

        // Update the aggregated response
        this.mergeFileResponse(aggregatedResponse, fileResponse.response);

        // Track metrics
        totalInputTokens += fileResponse.inputTokens;
        totalOutputTokens += fileResponse.outputTokens;
        totalCost += fileResponse.cost;

        sendTaskUpdate(
            taskId,
            "progress",
            `✅ Completed ${fileChange.path} (Cost: $${fileResponse.cost.toFixed(6)})`
        );
    }

    private createFileSearchQuery(fileChange: FileChanges, step: Step): string {
        // Create a search query that captures the essence of what we're looking for
        return [
            `File: ${fileChange.path}`,
            `Operation: ${fileChange.operation}`,
            `Step: ${step.title}`,
            `Context: ${step.thoughts}`,
            "Todos:",
            ...fileChange.todos.map((todo) => `- ${todo}`),
        ].join("\n");
    }

    private async generateSingleFileCode(
        model: string,
        request: CodingTaskRequest,
        step: Step,
        fileChange: FileChanges
    ): Promise<AIAssistantResponse<CodeChanges> | null> {
        // Prepare a file-specific prompt that includes step context
        const systemPrompt = this.getSystemPrompt();
        const filePrompt = this.getFileSpecificPrompt(step, fileChange);

        const userParams = {
            ...request.params,
            taskDescription: request.task,
        };

        // Build the user prompt
        const userPrompt = this.promptBuilder.buildUserPrompt(filePrompt, userParams);

        // Apply token limit to available files
        const { totalTokens, allowedFiles } = this.tokenLimiter.applyTokenLimit(
            model,
            systemPrompt + userPrompt,
            request.files
        );

        // Add files to prompt
        const finalPromptWithFiles = this.promptBuilder.addFilesToPrompt(userPrompt, allowedFiles);

        const folder = `${this.constructor.name}/${fileChange.path.replace(/\//g, "_")}`;
        saveRunInfo(request, folder, "system_prompt", systemPrompt);
        saveRunInfo(request, folder, "file_prompt", finalPromptWithFiles);

        // Generate response
        const aiResponse = await this.generateResponse(model, systemPrompt, finalPromptWithFiles);
        if (!aiResponse) return null;

        try {
            saveRunInfo(request, folder, "ai_response", aiResponse.response);
            // Parse the response to capture code changes
            const codeChanges = CodingAssistant.parseResponseToCodeChanges(aiResponse.response);

            return {
                ...aiResponse,
                response: codeChanges,
                responseStr: aiResponse.response,
                calculatedTokens: totalTokens,
            };
        } catch (error) {
            console.error(`Error parsing response for file ${fileChange.path}:`, error);
            console.error("Response excerpt:", aiResponse.response.substring(0, 500) + "...");
            return null;
        }
    }

    private getFileSpecificPrompt(step: Step, fileChange: FileChanges): string {
        // Create a prompt focused on a single file, but with step context
        return `
Here are the existing code files you will be working with:
<existing_codebase language="typescript">
${CODEFILES_PLACEHOLDER}
</existing_codebase>
        
Here is the task description:
<task_description>
${TASK_PLACEHOLDER}
</task_description>

Here is the implementation step to follow for this specific file:
<implementation_step>
 <title>${step.title}</title>
 <thoughts>${step.thoughts}</thoughts>
 <file>
  <path>${fileChange.path}</path>
  <operation>${fileChange.operation}</operation>
  <todos>
${fileChange.todos.map((todo) => `   <todo>${todo}</todo>`).join("\n")}
  </todos>
 </file>
</implementation_step>

<file_focus>
Please focus ONLY on implementing the following file:
- Path: ${fileChange.path}
- Operation: ${fileChange.operation}
</file_focus>

<response_format_instructions>
Respond in the following format:

<code_changes>
 <title>Brief title describing the change</title>
 <new_files>
  <file>
  <path>path/to/new/file1</path>
  <thoughts>Your thoughts on implementing this file</thoughts>
  <content>
<![CDATA[
// Full content of the new file goes here 
]]>
  </content>
  </file>      
 </new_files>
 <modified_files>
  <file>
  <path>path/to/modified/file1</path>
  <thoughts>Your thoughts on the modifications made to this file</thoughts>
  <content>
<![CDATA[
// Full content of the modified file goes here, including all changes 
]]>
  </content>
  </file>
 </modified_files>
 <deleted_files>
  <file>
   <path>path/to/deleted/file1</path>
  </file>
 </deleted_files>
</code_changes>
</response_format_instructions>

Now, generate the code for ONLY this file in the specified XML format. Include the COMPLETE content for the file.
`;
    }

    private mergeFileResponse(target: CodeChanges, source: CodeChanges): void {
        // Update title if not already set
        if (!target.title && source.title) {
            target.title = source.title;
        }

        // Merge new files
        if (source.newFiles && source.newFiles.length > 0) {
            for (const newFile of source.newFiles) {
                const existingIndex = target.newFiles.findIndex((f) => f.path === newFile.path);
                if (existingIndex >= 0) {
                    // Replace existing entry
                    target.newFiles[existingIndex] = newFile;
                } else {
                    // Add new entry
                    target.newFiles.push(newFile);
                }
            }
        }

        // Merge modified files
        if (source.modifiedFiles && source.modifiedFiles.length > 0) {
            for (const modFile of source.modifiedFiles) {
                const existingIndex = target.modifiedFiles.findIndex(
                    (f) => f.path === modFile.path
                );
                if (existingIndex >= 0) {
                    // Replace existing entry
                    target.modifiedFiles[existingIndex] = modFile;
                } else {
                    // Add new entry
                    target.modifiedFiles.push(modFile);
                }
            }
        }

        // Merge deleted files
        if (source.deletedFiles && source.deletedFiles.length > 0) {
            for (const delFile of source.deletedFiles) {
                if (!target.deletedFiles.some((f) => f.path === delFile.path)) {
                    target.deletedFiles.push(delFile);
                }
            }
        }
    }

    getPrompt(params?: any): string {
        throw new Error("Method not used.");
    }

    handleResponse(response: string): CodeChanges {
        throw new Error("Method not used.");
    }
}
