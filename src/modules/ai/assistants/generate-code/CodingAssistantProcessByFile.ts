import { CODEFILES_PLACEHOLDER, TASK_PLACEHOLDER } from "@/constants";
import { CodebaseAssistant } from "@/modules/ai/assistants/CodebaseAssistant";
import { PromptBuilder } from "@/modules/ai/support/PromptBuilder";
import { TokenLimiter } from "@/modules/ai/support/TokenLimiter";
import { RepositoryDataService } from "@/modules/db/RepositoryDataService";
import { sendTaskUpdate } from "@/modules/utils/sendTaskUpdate";
import { formatXml } from "@/modules/utils/formatXml";
import { saveRunInfo } from "@/modules/utils/saveRunInfo";
import { CodingAssistant } from "./CodingAssistant";
import { parseXml } from "@/modules/utils/parseXml";

import chalk from "chalk";

export class CodingAssistantByFile extends CodebaseAssistant<CodeChanges> {
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
        const implementationPlan: ImplementationPlan = params.implementationPlan;

        if (!implementationPlan || !implementationPlan.steps) {
            console.error("Failed to parse implementation plan or no steps found");
            return null;
        }

        const aggregatedResponse: CodeChanges = {
            title: "Implementation of requested features",
            newFiles: [],
            modifiedFiles: [],
            deletedFiles: [],
        };

        // Track metrics
        let metrics = {
            inputTokens: 0,
            outputTokens: 0,
            cost: 0,
        };

        // Calculate total files to process for progress reporting
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

                try {
                    // Get relevant files for this file change
                    const filesToUse = await this.getRelevantFilesForChange(
                        fileChange,
                        step,
                        files,
                        owner,
                        repo,
                        branch
                    );

                    // Process this file with relevant context
                    await this.processFileWithRelevantContext(
                        request,
                        model,
                        step,
                        fileChange,
                        filesToUse,
                        taskId,
                        aggregatedResponse,
                        metrics
                    );
                } catch (error) {
                    console.error(`Error processing file ${fileChange.path}:`, error);
                    sendTaskUpdate(taskId, "progress", `⚠️ Error processing ${fileChange.path}`);
                }
            }

            sendTaskUpdate(taskId, "progress", `Completed step: ${step.title}`);
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
            inputTokens: metrics.inputTokens,
            outputTokens: metrics.outputTokens,
            cost: metrics.cost,
            calculatedTokens: metrics.inputTokens + metrics.outputTokens,
        };
    }

    private async getRelevantFilesForChange(
        fileChange: FileChanges,
        step: Step,
        allFiles: FileDetails[],
        owner: string,
        repo: string,
        branch: string
    ): Promise<FileDetails[]> {
        // Prepare query for embedding search
        const fileQuery = this.createFileSearchQuery(fileChange, step);
        let filesToUse: FileDetails[] = [];

        try {
            // Get relevant files using embedding similarity
            console.log(`Finding similar files for: ---\n${fileQuery}\n--- using embeddings...`);
            const relevantFiles = await this.dataService.findSimilar(
                fileQuery,
                owner,
                repo,
                branch
            );
            console.log(`Found ${relevantFiles.length} similar files`);

            // Keep top 30 similar files
            filesToUse = relevantFiles.slice(0, 30);
        } catch (error) {
            console.error(`Error finding similar files for ${fileChange.path}:`, error);
            // Fallback to using all files if embedding search fails
            filesToUse = [...allFiles];
        }

        // Ensure target file is included for modification operations
        if (fileChange.operation === "modify") {
            const targetFile = allFiles.find((f) => f.path === fileChange.path);
            if (targetFile && !filesToUse.some((f) => f.path === targetFile.path)) {
                filesToUse.unshift(targetFile);
                console.log(`Added target file ${fileChange.path} for modification`);
            }
        }

        return filesToUse;
    }

    private async processFileWithRelevantContext(
        request: CodingTaskRequest,
        model: string,
        step: Step,
        fileChange: FileChanges,
        relevantFiles: FileDetails[],
        taskId: string,
        aggregatedResponse: CodeChanges,
        metrics: { inputTokens: number; outputTokens: number; cost: number }
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

        // Update metrics
        metrics.inputTokens += fileResponse.inputTokens;
        metrics.outputTokens += fileResponse.outputTokens;
        metrics.cost += fileResponse.cost;

        // Update the aggregated response directly
        this.addFileResponseToAggregate(aggregatedResponse, fileResponse.response);

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
            // Convert the simplified response format to CodeChanges
            const codeChanges = this.convertFileChangeToCodeChanges(
                aiResponse.response,
                fileChange
            );

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
        // Create a prompt focused on a single file with simpler response format
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

You must address ALL of the todos listed above in your implementation.
</file_focus>

<response_format_instructions>
Respond in the following simplified format:

<file_change>
    <title>Brief title describing this specific change</title>
    <path>${fileChange.path}</path>
    <operation>${fileChange.operation}</operation>
    <thoughts>
    Summary of your thoughts on this specific change
    </thoughts>
    ${
        fileChange.operation !== "delete"
            ? `<content>
<![CDATA[
// Complete file content goes here
]]>
    </content>`
            : ""
    }
    <todo_completion>
    <!-- For each todo item in the implementation_step above -->
    <todo_item id="1">
        <implementation>
        Brief explanation of specifically how you implemented this todo item in the code
        </implementation>
    </todo_item>
    <!-- Repeat for each todo with incrementing ids -->
    </todo_completion>
</file_change>
</response_format_instructions>

Now, generate the code ONLY for this specific file according to the format above. Make sure to:
1. Address ALL todos in the implementation
2. Provide complete file content (for new or modified files)
3. Explain how each todo was implemented
4. Ensure the code integrates well with the existing codebase
    `;
    }

    private convertFileChangeToCodeChanges(response: string, fileChange: FileChanges): CodeChanges {
        try {
            // Extract the file_change XML block
            const match = response.match(/<file_change>[\s\S]*<\/file_change>/);
            if (!match) {
                throw new Error("Could not find file_change in response");
            }

            // Parse the XML
            const xmlOptions = {
                ignoreAttributes: false,
                isArray: (name: string) => name === "todo_item",
            };

            const parsedData = parseXml<any>(match[0], xmlOptions);
            const fileChangeData = parsedData.file_change;

            // Create appropriate structure based on operation
            const codeChanges: CodeChanges = {
                title: fileChangeData.title || "",
                newFiles: [],
                modifiedFiles: [],
                deletedFiles: [],
            };

            const operation = fileChangeData.operation;
            const path = fileChangeData.path;
            const thoughts = fileChangeData.thoughts || "";
            const content = fileChangeData.content || "";

            if (operation === "new") {
                codeChanges.newFiles.push({ path, thoughts, content });
            } else if (operation === "modify") {
                codeChanges.modifiedFiles.push({ path, thoughts, content });
            } else if (operation === "delete") {
                codeChanges.deletedFiles.push({ path });
            }

            return codeChanges;
        } catch (error: any) {
            console.error(`Error parsing file_change response:`, error);

            // just return a minimal structure with the file path and error message
            return this.createMinimalCodeChange(
                fileChange.path,
                fileChange.operation,
                error.message
            );
        }
    }

    private createMinimalCodeChange(path: string, opr: string, message: string = ""): CodeChanges {
        const codeChanges: CodeChanges = {
            title: "",
            newFiles: [],
            modifiedFiles: [],
            deletedFiles: [],
        };

        if (opr === "new") {
            codeChanges.newFiles.push({ path, thoughts: "", content: message });
        } else if (opr === "modify") {
            codeChanges.modifiedFiles.push({ path, thoughts: "", content: message });
        } else if (opr === "delete") {
            codeChanges.deletedFiles.push({ path });
        }

        return codeChanges;
    }

    private addFileResponseToAggregate(target: CodeChanges, source: CodeChanges): void {
        // Add new files from source to target
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

        // Add modified files from source to target
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

        // Add deleted files from source to target
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
