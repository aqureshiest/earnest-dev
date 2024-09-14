import { saveRunInfo } from "@/modules/utils/saveRunInfo";
import { BaseAssistant } from "./BaseAssistant";

abstract class StandardAssistant<T extends TaskRequest, R> extends BaseAssistant<T, R> {
    async process(request: T): Promise<AIAssistantResponse<R> | null> {
        const { taskId, model, task, params } = request;

        console.log(
            `[${this.constructor.name}] Processing task:\n>>${task}\n>>with model: ${model}`
        );

        const systemPrompt = this.getSystemPrompt();
        const basePrompt = this.getPrompt();

        const userParams = {
            ...params,
            taskDescription: task,
        };

        // Build the user prompt first
        const userPrompt = this.promptBuilder.buildUserPrompt(basePrompt, userParams);

        // apply token limit
        const { totalTokens, prompt: finalizedPrompt } = this.tokenLimiter.applyTokenLimitToPrompt(
            model,
            systemPrompt + userPrompt
        );

        const caller = this.constructor.name;
        saveRunInfo(request, caller, "system_prompt", systemPrompt);
        saveRunInfo(request, caller, "user_prompt", finalizedPrompt);

        // generate response
        const aiResponse = await this.generateResponse(model, systemPrompt, finalizedPrompt);
        if (!aiResponse) return null;

        // parse the response
        saveRunInfo(request, caller, "ai_response", aiResponse.response);
        const parsed = this.handleResponse(aiResponse.response);
        saveRunInfo(request, caller, "ai_response_parsed", parsed, this.responseType());

        return {
            ...aiResponse,
            response: parsed,
            responseStr: aiResponse.response,
            calculatedTokens: totalTokens,
        };
    }
}

export { StandardAssistant };
