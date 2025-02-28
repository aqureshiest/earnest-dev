import { CODEFILES_PLACEHOLDER, TASK_PLACEHOLDER } from "@/constants";
import { CodebaseAssistant } from "@/modules/ai/assistants/CodebaseAssistant";
import { PromptBuilder } from "@/modules/ai/support/PromptBuilder";
import { TokenLimiter } from "@/modules/ai/support/TokenLimiter";
import { RepositoryDataService } from "@/modules/db/RepositoryDataService";
import { sendTaskUpdate } from "@/modules/utils/sendTaskUpdate";
import { formatXml } from "@/modules/utils/formatXml";
import { saveRunInfo } from "@/modules/utils/saveRunInfo";
import { CodingAssistant } from "./CodingAssistant";

import chalk from "chalk";

export class CodingAssistantProcessByStepWithContext extends CodebaseAssistant<CodeChanges> {
    private dataService: RepositoryDataService;
    private completedSteps: Array<{
        title: string;
        summary: string;
        modifiedFiles: string[];
    }> = [];

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
            sendTaskUpdate(
                taskId,
                "progress",
                `Starting step: ${step.title} (${progressPercent}%)`
            );

            try {
                // Get relevant files for this step
                const filesToUse = await this.getRelevantFilesForStep(
                    step,
                    files,
                    owner,
                    repo,
                    branch
                );

                // Process this step with relevant context
                const stepResponse = await this.processStepWithRelevantContext(
                    request,
                    model,
                    step,
                    filesToUse,
                    taskId,
                    aggregatedResponse,
                    metrics
                );

                if (stepResponse) {
                    // Generate a summary of what was done in this step
                    const stepSummary = await this.generateStepSummary(
                        model,
                        step,
                        stepResponse,
                        taskId
                    );

                    // Track completed step with its summary
                    this.completedSteps.push({
                        title: step.title,
                        summary: stepSummary.backendSummary,
                        modifiedFiles: this.getStepModifiedFiles(stepResponse),
                    });

                    // Send summary to frontend
                    sendTaskUpdate(taskId, "summary", {
                        step: step.title,
                        summary: stepSummary.markdownSummary,
                    });
                }

                sendTaskUpdate(taskId, "progress", `Completed step: ${step.title}`);
            } catch (error) {
                console.error(`Error processing step "${step.title}":`, error);
                sendTaskUpdate(taskId, "progress", `⚠️ Error processing step: ${step.title}`);
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
        const files: string[] = [];

        if (stepResponse.newFiles) {
            files.push(...stepResponse.newFiles.map((f) => f.path));
        }

        if (stepResponse.modifiedFiles) {
            files.push(...stepResponse.modifiedFiles.map((f) => f.path));
        }

        if (stepResponse.deletedFiles) {
            files.push(...stepResponse.deletedFiles.map((f) => f.path));
        }

        return files;
    }

    private async generateStepSummary(
        model: string,
        step: Step,
        stepResponse: CodeChanges,
        taskId: string
    ): Promise<{ backendSummary: string; markdownSummary: string }> {
        try {
            // Create a prompt for generating a summary in XML format
            const systemPrompt = `You are an expert software developer creating a concise summary of completed code changes.
    Your task is to summarize the specific actions completed in an implementation step.
    You must return your response in XML format exactly as specified.`;

            // Prepare information about file changes
            const newFilesList = stepResponse.newFiles?.map((f) => f.path).join(", ") || "None";
            const modifiedFilesList =
                stepResponse.modifiedFiles?.map((f) => f.path).join(", ") || "None";
            const deletedFilesList =
                stepResponse.deletedFiles?.map((f) => f.path).join(", ") || "None";

            const userPrompt = `
Step: ${step.title}

Original step instructions:
${step.thoughts}

Files changed:
- Created: ${newFilesList}
- Modified: ${modifiedFilesList}
- Deleted: ${deletedFilesList}

Create TWO distinct summaries:

1. A backend summary consisting of 4-6 points max that lists the specific actions completed in this step.
    Each point should be a single sentence starting with a verb in past tense (Created, Added, Modified, Refactored, etc.).
    Focus on WHAT was done, not WHY or architectural explanations.

2. A concise, human-friendly markdown summary that explains what was accomplished.
    This should be 1-2 sentences that clearly state what changed or was implemented.
    Use markdown formatting for emphasis, and keep it brief but informative.
    Focus on the "what" rather than the "how" or "why".

RESPONSE FORMAT:
You must return your response in this exact XML format:

<response>
    <backend_summary>
        <point>Created PaymentService interface with core methods</point>
        <point>Implemented validation logic for payment operations</point>
        <point>Added helper methods for date and amount validation</point>
    </backend_summary>
    <markdown_summary>
## ${step.title}

Implemented **payment processing service** with validation rules and core transaction handling methods.
    </markdown_summary>
</response>

Your response should ONLY contain these XML tags with your summaries, nothing else.
    `;

            sendTaskUpdate(taskId, "progress", `Generating summary for step "${step.title}"...`);

            const summaryResponse = await this.generateResponse(model, systemPrompt, userPrompt);
            if (!summaryResponse) {
                const defaultSummary = `- Completed ${step.title}`;
                return {
                    backendSummary: defaultSummary,
                    markdownSummary: `## ${step.title}\n\nCompleted step successfully.`,
                };
            }

            // Extract the summaries from the XML
            const xmlString = summaryResponse.response.trim();

            // Parse backend summary
            const backendMatch = xmlString.match(/<backend_summary>([\s\S]*?)<\/backend_summary>/);
            let backendSummary = `- Completed ${step.title}`;

            if (backendMatch && backendMatch[1]) {
                const pointMatches = backendMatch[1].match(/<point>([\s\S]*?)<\/point>/g) || [];
                const points = pointMatches.map(
                    (p) => `- ${p.replace(/<point>([\s\S]*?)<\/point>/, "$1").trim()}`
                );
                backendSummary = points.join("\n");
            }

            // Parse markdown summary
            const markdownMatch = xmlString.match(
                /<markdown_summary>([\s\S]*?)<\/markdown_summary>/
            );
            let markdownSummary = `## ${step.title}\n\nCompleted step successfully.`;

            if (markdownMatch && markdownMatch[1]) {
                markdownSummary = markdownMatch[1].trim();
            }

            return { backendSummary, markdownSummary };
        } catch (error) {
            console.error("Error generating step summary:", error);
            return {
                backendSummary: `• Completed ${step.title}`,
                markdownSummary: `## ${step.title} Completed\n\nThis step has been finished successfully.`,
            };
        }
    }

    private async getRelevantFilesForStep(
        step: Step,
        allFiles: FileDetails[],
        owner: string,
        repo: string,
        branch: string
    ): Promise<FileDetails[]> {
        // Prepare query for embedding search based on the entire step
        const stepQuery = this.createStepSearchQuery(step);
        let filesToUse: FileDetails[] = [];

        try {
            // Get relevant files using embedding similarity
            console.log(`Finding similar files for step "${step.title}" using embeddings...`);
            const relevantFiles = await this.dataService.findSimilar(
                stepQuery,
                owner,
                repo,
                branch
            );

            // Keep top 30 similar files
            filesToUse = relevantFiles.slice(0, 30);
        } catch (error) {
            console.error(`Error finding similar files for step "${step.title}":`, error);
            // Fallback to using all files if embedding search fails
            filesToUse = [...allFiles];
        }

        // Ensure all target files for modification are included
        for (const fileChange of step.files) {
            if (fileChange.operation === "modify") {
                const targetFile = allFiles.find((f) => f.path === fileChange.path);
                if (targetFile && !filesToUse.some((f) => f.path === targetFile.path)) {
                    filesToUse.unshift(targetFile);
                    console.log(`Added target file ${fileChange.path} for modification`);
                }
            }
        }

        return filesToUse;
    }

    private async processStepWithRelevantContext(
        request: CodingTaskRequest,
        model: string,
        step: Step,
        relevantFiles: FileDetails[],
        taskId: string,
        aggregatedResponse: CodeChanges,
        metrics: { inputTokens: number; outputTokens: number; cost: number }
    ): Promise<CodeChanges | null> {
        // Create a step-specific request with relevant context files
        const stepRequest: CodingTaskRequest = {
            ...request,
            files: relevantFiles,
        };

        // Generate code for this step
        const stepResponse = await this.generateStepCode(model, stepRequest, step);

        if (!stepResponse?.response) {
            console.error(`Failed to generate code for step: ${step.title}`);
            sendTaskUpdate(
                taskId,
                "progress",
                `⚠️ Failed to generate code for step: ${step.title}`
            );
            return null;
        }

        // Update metrics
        metrics.inputTokens += stepResponse.inputTokens;
        metrics.outputTokens += stepResponse.outputTokens;
        metrics.cost += stepResponse.cost;

        // Update the aggregated response directly
        this.addStepResponseToAggregate(aggregatedResponse, stepResponse.response);

        // Send individual file updates for the frontend
        this.sendFileUpdates(taskId, stepResponse.response);

        sendTaskUpdate(
            taskId,
            "progress",
            `Completed step "${step.title}" (Cost: $${stepResponse.cost.toFixed(6)})`
        );

        return stepResponse.response;
    }

    private createStepSearchQuery(step: Step): string {
        // Create a search query that captures the essence of the entire step
        const fileDescriptions = step.files
            .map((file) => `${file.operation} ${file.path}: ${file.todos.join(", ")}`)
            .join("\n");

        return [
            `Step: ${step.title}`,
            `Context: ${step.thoughts}`,
            `Files:`,
            fileDescriptions,
        ].join("\n");
    }

    private async generateStepCode(
        model: string,
        request: CodingTaskRequest,
        step: Step
    ): Promise<AIAssistantResponse<CodeChanges> | null> {
        // Prepare a step-specific prompt
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
            model,
            systemPrompt + userPrompt,
            request.files
        );

        // Add files to prompt
        const finalPromptWithFiles = this.promptBuilder.addFilesToPrompt(userPrompt, allowedFiles);

        const folder = `${this.constructor.name}/${step.title.replace(/\s+/g, "_")}`;
        saveRunInfo(request, folder, "system_prompt", systemPrompt);
        saveRunInfo(request, folder, "step_prompt", finalPromptWithFiles);

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
            console.error(`Error parsing response for step "${step.title}":`, error);
            console.error("Response excerpt:", aiResponse.response.substring(0, 500) + "...");
            return null;
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
${file.todos.map((todo) => `        <todo>${todo}</todo>`).join("\n")}
    </todos>
</file>`;
            })
            .join("\n    ");

        // Generate context from previously completed steps
        const previousStepsContext = this.getPreviousStepsContext(step);

        // Create a prompt that focuses on a complete step with context from previous steps
        return `
Here are the existing code files you will be working with:
<existing_codebase language="typescript">
${CODEFILES_PLACEHOLDER}
</existing_codebase>
        
Here is the task description:
<task_description>
${TASK_PLACEHOLDER}
</task_description>

${previousStepsContext}

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
</code_changes>
</response_format_instructions>

Now, generate the code for ALL files in this step according to the format above. Make sure to:
1. Address ALL todos in the implementation
2. Provide complete file content for each new or modified file
3. Ensure the code integrates well with the existing codebase
4. Maintain consistency with previous implementation steps
`;
    }

    private getPreviousStepsContext(currentStep: Step): string {
        if (this.completedSteps.length === 0) {
            return ""; // No previous steps
        }

        // Find files in the current step
        const currentStepFiles = new Set(currentStep.files.map((f) => f.path));

        // Get relevant previous steps - either:
        // 1. Steps that modified files relevant to the current step
        // 2. The most recent steps (up to 3)
        const relevantSteps = this.completedSteps.filter((prevStep) =>
            // Check if any files in this previous step are also in the current step
            prevStep.modifiedFiles.some((filePath) => currentStepFiles.has(filePath))
        );

        // If we don't have any directly relevant steps, just include the most recent ones
        const stepsToInclude =
            relevantSteps.length > 0 ? relevantSteps : this.completedSteps.slice(-3); // Last 3 steps

        if (stepsToInclude.length === 0) {
            return "";
        }

        // Generate the context section
        return `
<previous_implementations>
${stepsToInclude
    .map(
        (step) => `    <step>
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

    getPrompt(params?: any): string {
        throw new Error("Method not used.");
    }

    handleResponse(response: string): CodeChanges {
        throw new Error("Method not used.");
    }
}
