import { saveRunInfo } from "@/modules/utils/saveRunInfo";
import { BaseAssistant } from "./BaseAssistant";

abstract class CodebaseAssistant<R> extends BaseAssistant<CodingTaskRequest, R> {
    async process(request: CodingTaskRequest): Promise<AIAssistantResponse<R> | null> {
        const { model, task, taskId, files, params } = request;

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

        // Apply token limit to system prompt + user prompt, and get allowed files
        const { totalTokens, allowedFiles } = this.tokenLimiter.applyTokenLimit(
            model,
            systemPrompt + userPrompt,
            files
        );
        console.log("Total tokens after applying limit:", totalTokens);

        // Now add the allowed files to the prompt
        const finalPromptWithFiles = this.promptBuilder.addFilesToPrompt(userPrompt, allowedFiles);

        const caller = this.constructor.name;
        saveRunInfo(request, caller, "system_prompt", systemPrompt);
        saveRunInfo(request, caller, "user_prompt", finalPromptWithFiles);

        // generate response
        const aiResponse = await this.generateResponse(model, systemPrompt, finalPromptWithFiles);
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

export { CodebaseAssistant };
