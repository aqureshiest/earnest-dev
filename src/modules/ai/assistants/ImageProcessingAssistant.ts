import { saveRunInfo } from "@/modules/utils/saveRunInfo";
import { BaseAssistant } from "./BaseAssistant";

import chalk from "chalk";

abstract class ImageProcessingAssistant<T extends ImageProcessTaskRequest, R> extends BaseAssistant<
    T,
    R
> {
    async process(request: T): Promise<AIAssistantResponse<R> | null> {
        const { taskId, model, task, params, description: imageDescription, imageBuffer } = request;

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

        const caller = this.constructor.name;
        saveRunInfo(request, caller, "system_prompt", systemPrompt);
        saveRunInfo(request, caller, "user_prompt", finalizedPrompt);

        // generate responsex
        const aiResponse = await this.generateImageResponse(
            model,
            systemPrompt,
            finalizedPrompt,
            imageBuffer
        );
        if (!aiResponse) return null;

        // parse the response
        saveRunInfo(request, caller, "ai_response", aiResponse.response);
        const parsed = this.handleResponse(aiResponse.response, taskId);
        saveRunInfo(request, caller, "ai_response_parsed", parsed, this.responseType);

        return {
            ...aiResponse,
            response: parsed,
            responseStr: aiResponse.response,
            calculatedTokens: totalTokens,
        };
    }
}

export { ImageProcessingAssistant };
