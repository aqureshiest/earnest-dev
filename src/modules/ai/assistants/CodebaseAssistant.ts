import { saveRunInfo } from "@/modules/utils/saveRunInfo";
import { BaseAssistant } from "./BaseAssistant";
import chalk from "chalk";

abstract class CodebaseAssistant<R> extends BaseAssistant<CodingTaskRequest, R> {
    async process(request: CodingTaskRequest): Promise<AIAssistantResponse<R> | null> {
        const { model, task, taskId, files, params } = request;

        console.log(
            `[${chalk.yellow(
                this.constructor.name
            )}] Processing task:\n>>${task}\n>>with model: ${model}`
        );

        const systemPrompt = this.getSystemPrompt();
        const basePrompt = this.getPrompt(request);

        const userParams = {
            ...params,
            taskDescription: task,
        };

        // Build the user prompt first
        const userPrompt = this.promptBuilder.buildUserPrompt(basePrompt, userParams);

        // Apply token limit to system prompt + user prompt, and get allowed files
        const { totalTokens, allowedFiles } = this.tokenLimiter.applyTokenLimit(
            systemPrompt + userPrompt,
            files,
            model,
            this.tokenAllocation
        );

        // Now add the allowed files to the prompt
        const finalPromptWithFiles = this.promptBuilder.addFilesToPrompt(userPrompt, allowedFiles);

        const folder = `${this.constructor.name}/${this.taskTrimmed(task)}`;
        saveRunInfo(request, folder, "system_prompt", systemPrompt);
        saveRunInfo(request, folder, "user_prompt", finalPromptWithFiles);

        // generate response
        const aiResponse = await this.generateResponse(model, systemPrompt, finalPromptWithFiles);
        if (!aiResponse) return null;

        // parse the response
        saveRunInfo(request, folder, "ai_response", aiResponse.response);
        const parsed = this.handleResponse(aiResponse.response, taskId);
        saveRunInfo(request, folder, "ai_response_parsed", parsed, this.responseType);

        return {
            ...aiResponse,
            response: parsed,
            responseStr: aiResponse.response,
            calculatedTokens: totalTokens,
        };
    }

    private taskTrimmed(task: string): string {
        const taskStr = task.toLowerCase().replace(/\s+/g, "_");
        if (taskStr.length <= 30) {
            return taskStr;
        }
        const start = taskStr.substring(0, 15);
        const end = taskStr.substring(taskStr.length - 15);
        return `${start}-${end}`;
    }
}

export { CodebaseAssistant };
