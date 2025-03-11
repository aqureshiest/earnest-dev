import { CODEFILES_PLACEHOLDER, TASK_PLACEHOLDER } from "@/constants";
import { RepositoryDataService } from "@/modules/db/RepositoryDataService";
import { formatXml } from "@/modules/utils/formatXml";
import { saveRunInfo } from "@/modules/utils/saveRunInfo";
import { CodingAssistant } from "./CodingAssistant";

import chalk from "chalk";
import { CodeIndexer } from "../../support/CodeIndexer";
import { sendTaskUpdate } from "@/modules/utils/sendTaskUpdate";
import { calculateSimilarityThreshold, ScoredFile } from "@/modules/utils/similarityThreshold";
import { reportError } from "@/modules/bugsnag/report";

export class CodingAssistantProcessByStep extends CodingAssistant {
    tokenAllocation: number = 20;

    private indexer: CodeIndexer;
    private dataService: RepositoryDataService;

    private completedSteps: Array<{
        title: string;
        summary: string;
        modifiedFiles: string[];
    }> = [];

    constructor() {
        super();
        this.indexer = new CodeIndexer();
        this.dataService = new RepositoryDataService();
    }

    async process(request: CodingTaskRequest): Promise<AIAssistantResponse<CodeChanges> | null> {
        const { model, task, taskId, files, params, owner, repo, branch } = request;

        console.log(
            `[${chalk.yellow(
                this.constructor.name
            )}] Processing task:\n>>${task}\n>>with model: ${model}`
        );

        // Reset completed steps
        this.completedSteps = [];

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

        // Calculate total steps to process for progress reporting
        const totalStepCount = implementationPlan.steps.length;

        // Process each step individually
        for (let stepIndex = 0; stepIndex < implementationPlan.steps.length; stepIndex++) {
            const step = implementationPlan.steps[stepIndex];
            const progressPercent = Math.round(((stepIndex + 1) / totalStepCount) * 100);

            console.log(
                `[${chalk.blue(this.constructor.name)}] Processing step (${
                    stepIndex + 1
                }/${totalStepCount}): ${step.title}`
            );
            sendTaskUpdate(taskId, "step_status", {
                title: step.title,
                status: "started",
                stepIndex: stepIndex,
                totalSteps: totalStepCount,
                progressPercent,
            });

            try {
                // Get relevant files for this step
                const filesToUse = await this.getRelevantFilesForStep(
                    step,
                    files,
                    owner,
                    repo,
                    branch,
                    params.maximizeTokenUsage
                );

                // Process this step with relevant context
                const { codeChanges, summary } = await this.processStepWithRelevantContext(
                    request,
                    model,
                    step,
                    filesToUse,
                    taskId,
                    metrics
                );

                // Track completed step with its summary
                if (codeChanges && summary) {
                    this.completedSteps.push({
                        title: step.title,
                        summary: summary.technicalSummary,
                        modifiedFiles: this.getStepModifiedFiles(codeChanges),
                    });

                    // Send completed step update
                    sendTaskUpdate(taskId, "step_status", {
                        title: step.title,
                        status: "completed",
                        stepIndex: stepIndex,
                        totalSteps: totalStepCount,
                        summary: summary.markdownSummary,
                    });

                    // update aggregated response
                    this.addStepResponseToAggregate(aggregatedResponse, codeChanges);

                    // send file upadtes
                    this.sendFileUpdates(taskId, codeChanges);
                } else {
                    sendTaskUpdate(taskId, "step_status", {
                        title: step.title,
                        status: "error",
                        stepIndex: stepIndex,
                        totalSteps: totalStepCount,
                        error: "Failed to process step",
                    });

                    reportError("Failed to process step", {
                        step: {
                            title: step.title,
                        },
                        task: {
                            id: taskId,
                            model,
                            owner,
                            repo,
                            branch,
                        },
                    });
                }

                sendTaskUpdate(taskId, "progress", `Completed step: ${step.title}`);
            } catch (error: any) {
                console.error(`Error processing step "${step.title}":`, error);

                sendTaskUpdate(taskId, "step_status", {
                    title: step.title,
                    status: "error",
                    stepIndex: stepIndex,
                    totalSteps: totalStepCount,
                    error: error.message,
                });

                reportError(error, {
                    step: {
                        title: step.title,
                    },
                    task: {
                        id: taskId,
                        model,
                        owner,
                        repo,
                        branch,
                    },
                });
            }
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

    private getStepModifiedFiles(stepResponse: CodeChanges): string[] {
        return [
            ...(stepResponse.newFiles?.map((f) => f.path) || []),
            ...(stepResponse.modifiedFiles?.map((f) => f.path) || []),
            ...(stepResponse.deletedFiles?.map((f) => f.path) || []),
        ];
    }

    private async getRelevantFilesForStep(
        step: Step,
        allFiles: FileDetails[],
        owner: string,
        repo: string,
        branch: string,
        maximizeTokenUsage = false
    ): Promise<FileDetails[]> {
        // First, add all files explicitly mentioned in the step
        const targetFiles = new Set<string>();
        const filesToUse: FileDetails[] = [];

        // Always include files explicitly mentioned for modification or deletion
        for (const fileChange of step.files) {
            if (fileChange.operation === "modify" || fileChange.operation === "delete") {
                const targetFile = allFiles.find((f) => f.path === fileChange.path);
                if (targetFile && !targetFiles.has(targetFile.path)) {
                    filesToUse.push(targetFile);
                    targetFiles.add(targetFile.path);
                }
            }
        }

        try {
            // Create a comprehensive query from the step details
            const stepQuery = `${step.title}. ${step.thoughts}. ${step.files
                .map((file) => `${file.operation} ${file.path}: ${file.todos.join(", ")}`)
                .join(" ")}`;

            const embedding = await this.indexer.generateEmbedding(stepQuery);

            // Find similar files using chunk-based similarity
            const similarFiles = await this.dataService.findSimilarFilesByChunks(
                owner,
                repo,
                branch,
                embedding
            );

            const scoredFiles: ScoredFile[] = similarFiles.map((file) => ({
                path: file.path,
                similarity: file.similarity || 0,
            }));

            // Calculate optimal threshold
            const threshold = maximizeTokenUsage ? 0.2 : calculateSimilarityThreshold(scoredFiles);
            console.log(
                chalk.yellow(
                    `similarity threshold for step "${step.title}": ${threshold}, max? ${maximizeTokenUsage}`
                )
            );

            // Add top similar files that aren't already included (up to our limit)
            for (const file of similarFiles) {
                if ((file.similarity || 0) >= threshold && !targetFiles.has(file.path)) {
                    filesToUse.push(file);
                    targetFiles.add(file.path);
                }
            }
        } catch (error: any) {
            console.error(`Error finding similar files for step "${step.title}":`, error);
            // If similarity search fails, we'll just use the explicitly mentioned files

            // report bugsnag
            reportError(`Error in finding similar files: ${error.message}`, {
                step: {
                    title: step.title,
                },
                task: {
                    owner,
                    repo,
                    branch,
                },
            });
        }

        console.log(
            chalk.yellow("\n..... Final set of Files to use ......\n"),
            filesToUse.map((f) => `${f.path} - ${f.similarity}`).join("\n")
        );

        if (filesToUse.length === 0) {
            throw new Error("No relevant files found for step, Cant proceed");
        }

        console.log(`Selected ${filesToUse.length} files for step "${step.title}"`);
        return filesToUse;
    }

    private async processStepWithRelevantContext(
        request: CodingTaskRequest,
        model: string,
        step: Step,
        relevantFiles: FileDetails[],
        taskId: string,
        metrics: { inputTokens: number; outputTokens: number; cost: number }
    ): Promise<{
        codeChanges: CodeChanges | null;
        summary: { technicalSummary: string; markdownSummary: string } | null;
    }> {
        console.log(`Processing step "${step.title}" with ${relevantFiles.length} files`);
        sendTaskUpdate(
            taskId,
            "progress",
            `Processing step with ${relevantFiles.length} relevant files`
        );

        // Prepare a step-specific prompt that includes summary request
        const systemPrompt = this.getSystemPrompt();
        const stepPrompt = this.getStepSpecificPrompt(step);

        const userParams = {
            ...request.params,
            taskDescription: request.task,
        };

        // Build the user prompt
        const userPrompt = this.promptBuilder.buildUserPrompt(stepPrompt, userParams);

        // Apply token limit to available files
        const { totalTokens, allowedFiles } = this.tokenLimiter.applyTokenLimit(
            systemPrompt + userPrompt,
            relevantFiles,
            model,
            this.tokenAllocation
        );
        // Add files to prompt
        const finalPromptWithFiles = this.promptBuilder.addFilesToPrompt(userPrompt, allowedFiles);

        // Save info for debugging
        const folder = `${this.constructor.name}/${step.title.replace(/\s+/g, "_")}`;
        saveRunInfo(request, folder, "system_prompt", systemPrompt);
        saveRunInfo(request, folder, "step_prompt", finalPromptWithFiles);

        // Generate response
        const aiResponse = await this.generateResponse(model, systemPrompt, finalPromptWithFiles);
        if (!aiResponse) return { codeChanges: null, summary: null };

        try {
            saveRunInfo(request, folder, "ai_response", aiResponse.response);

            // Extract code changes and summary from the combined response
            const { codeChanges, summary } = this.extractResponse(aiResponse.response, step);

            // Update metrics
            metrics.inputTokens += aiResponse.inputTokens;
            metrics.outputTokens += aiResponse.outputTokens;
            metrics.cost += aiResponse.cost;

            return { codeChanges, summary };
        } catch (error) {
            console.error(`Error parsing response for step "${step.title}":`, error);
            console.error("Response excerpt:", aiResponse.response.substring(0, 500) + "...");
            return { codeChanges: null, summary: null };
        }
    }

    private getStepSpecificPrompt(step: Step): string {
        // List all files in the step for clearer prompt structure
        const filesList = step.files
            .map((file) => {
                return `<file>
<path>${file.path}</path>
<operation>${file.operation}</operation>
<todos>
${file.todos.map((todo) => `    <todo>${todo}</todo>`).join("\n")}
</todos>
</file>`;
            })
            .join("\n    ");

        return `
Here are the existing code files you will be working with:
<existing_codebase language="typescript">
${CODEFILES_PLACEHOLDER}
</existing_codebase>
    
Here is the task description:
<task_description>
${TASK_PLACEHOLDER}
</task_description>

${this.getPreviousStepsContext()}

Here is the implementation step to follow:
<implementation_step>
<title>${step.title}</title>
<thoughts>${step.thoughts}</thoughts>
<files>
${filesList}
</files>
</implementation_step>

<step_focus>
Please implement all the files in this step as specified in the implementation_step.
This step involves ${step.files.length} file change(s).
</step_focus>

<response_format_instructions>
Important: 
- Use only ONE <new_files> section for ALL new files
- Use only ONE <modified_files> section for ALL modified files  
- Use only ONE <deleted_files> section for ALL deleted files

Respond in the following format:

<code_changes>
<title>Brief title describing the implementation of this step</title>
<new_files>
<file>
<path>path/to/new/file1</path>
<thoughts>Thoughts on the creation of this file</thoughts>
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
<technical_summary>
<!-- points briefly describing what was implemented in this step -->
<point>First specific action taken</point>
<point>Second specific action taken</point>
</technical_summary>
<markdown_summary>
Write a brief, conversational summary of what you implemented - as if you're a developer explaining your changes to a teammate over coffee. Keep it friendly, concise (2-3 sentences), and focus on the "why" as much as the "what". Avoid technical jargon unless necessary. Skip any greetings like "Hey team" and get straight to the point. Light humor is welcome if appropriate to the context.
Use ### for headings and **bold** for emphasis.
</markdown_summary>
</code_changes>
</response_format_instructions>

Now, generate the code for ALL files in this step according to the format above. Make sure to:
1. Address ALL todos in the implementation
2. Provide complete file content for each new or modified file
3. Ensure the code integrates well with the existing codebase
4. Maintain consistency with previous implementation steps
5. Include concise summary points describing what you did
`;
    }

    private getPreviousStepsContext(): string {
        if (this.completedSteps.length === 0) {
            return ""; // No previous steps
        }

        return `
<previous_implementations>
${this.completedSteps
    .map(
        (step) => `<step>
<title>${step.title}</title>
<summary>${step.summary}</summary>
<files>${step.modifiedFiles.join(", ")}</files>
</step>`
    )
    .join("\n")}
</previous_implementations>
    `;
    }

    private addStepResponseToAggregate(target: CodeChanges, source: CodeChanges): void {
        // Helper function to merge files with path-based deduplication
        const mergeFiles = <T extends { path: string }>(
            targetArray: T[],
            sourceArray: T[] | undefined
        ): void => {
            if (!sourceArray || sourceArray.length === 0) return;

            // Create a map for faster lookups instead of using findIndex/some in loops
            const targetMap = new Map(targetArray.map((file) => [file.path, file]));
            sourceArray.forEach((sourceFile) => {
                targetMap.set(sourceFile.path, sourceFile);
            });

            // Update the target array with the merged results
            targetArray.length = 0;
            targetArray.push(...Array.from(targetMap.values()));
        };

        // Merge new files
        mergeFiles(target.newFiles, source.newFiles);

        // Merge modified files
        mergeFiles(target.modifiedFiles, source.modifiedFiles);

        // Handle deleted files (these are typically just paths without content)
        if (source.deletedFiles && source.deletedFiles.length > 0) {
            const existingPaths = new Set(target.deletedFiles.map((file) => file.path));

            for (const delFile of source.deletedFiles) {
                if (!existingPaths.has(delFile.path)) {
                    target.deletedFiles.push(delFile);
                    existingPaths.add(delFile.path);
                }
            }
        }
    }

    private sendFileUpdates(taskId: string, codeChanges: CodeChanges): void {
        // Send individual file updates for frontend display
        // New files
        for (const file of codeChanges.newFiles || []) {
            sendTaskUpdate(taskId, "file", {
                path: file.path,
                operation: "new",
                content: file.content,
                thoughts: file.thoughts,
            });
        }

        // Modified files
        for (const file of codeChanges.modifiedFiles || []) {
            sendTaskUpdate(taskId, "file", {
                path: file.path,
                operation: "modify",
                content: file.content,
                thoughts: file.thoughts,
            });
        }

        // Deleted files
        for (const file of codeChanges.deletedFiles || []) {
            sendTaskUpdate(taskId, "file", {
                path: file.path,
                operation: "delete",
            });
        }
    }

    private extractResponse(
        response: string,
        step: Step
    ): {
        codeChanges: CodeChanges;
        summary: { technicalSummary: string; markdownSummary: string } | null;
    } {
        try {
            // Get code_changes block
            const match = response.match(/<code_changes>[\s\S]*?<\/code_changes>/);
            if (!match) {
                throw new Error("No code_changes block found in response");
            }

            const fullContents = match[0];

            // Extract all parts in a more streamlined way
            const codeChangesXml = fullContents.replace(
                /<(markdown_summary|technical_summary)>[\s\S]*?<\/\1>/g,
                ""
            );

            // Parse code changes
            const codeChanges = CodingAssistant.parseResponseToCodeChanges(codeChangesXml);

            // Extract summaries with simplified approach
            const techSummary = (fullContents.match(
                /<technical_summary>([\s\S]*?)<\/technical_summary>/
            ) || [])[1];
            const markdownSummary = (response.match(
                /<markdown_summary>([\s\S]*?)<\/markdown_summary>/
            ) || [])[1];

            // Format technical summary
            const technicalSummary = techSummary
                ? (techSummary.match(/<point>([\s\S]*?)<\/point>/g) || [])
                      .map((p) => `- ${p.replace(/<point>([\s\S]*?)<\/point>/, "$1").trim()}`)
                      .join("\n") || `- Completed ${step.title}`
                : `- Completed ${step.title}`;

            // Format markdown summary
            let formattedMarkdownSummary =
                markdownSummary?.trim() || `## ${step.title}\n\nCompleted step successfully.`;
            if (!formattedMarkdownSummary.startsWith("#")) {
                formattedMarkdownSummary = `## ${step.title}\n\n${formattedMarkdownSummary}`;
            }

            return {
                codeChanges,
                summary: {
                    technicalSummary,
                    markdownSummary: formattedMarkdownSummary,
                },
            };
        } catch (error) {
            console.error("Error extracting code changes:", error);

            reportError(error as Error, {
                extraction: {
                    stepTitle: step.title,
                    responseLength: response?.length || 0,
                    responseExcerpt:
                        response?.substring(0, 500) +
                        "..." +
                        response?.substring(response.length - 500),
                },
            });

            throw error;
        }
    }
}
