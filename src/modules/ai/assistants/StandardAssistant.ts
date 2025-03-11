import { saveRunInfo } from "@/modules/utils/saveRunInfo";
import { BaseAssistant } from "./BaseAssistant";
import chalk from "chalk";

abstract class StandardAssistant<T extends TaskRequest, R> extends BaseAssistant<T, R> {
    async process(request: T): Promise<AIAssistantResponse<R> | null> {
        const { taskId, model, task, params } = request;

        console.log(
            `\n[${chalk.yellow(
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

        // apply token limit
        const { totalTokens, prompt: finalizedPrompt } = this.tokenLimiter.applyTokenLimitToPrompt(
            systemPrompt,
            userPrompt,
            model,
            this.tokenAllocation
        );

        const folder = `${this.constructor.name}/${this.taskTrimmed(task)}`;
        saveRunInfo(request, folder, "system_prompt", systemPrompt);
        saveRunInfo(request, folder, "user_prompt", finalizedPrompt);

        // generate responsex
        const aiResponse = await this.generateResponse(model, systemPrompt, finalizedPrompt);
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

export { StandardAssistant };
