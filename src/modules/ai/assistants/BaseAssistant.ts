import { parseYaml } from "@/modules/utilities/parseYaml";
import { saveRunInfo } from "@/modules/utilities/saveRunInfo";
import { LLM_MODELS } from "../../utilities/llmInfo";
import { ClaudeAIService } from "../clients/ClaudeAIService";
import { OpenAIService } from "../clients/OpenAIService";
import { TokenLimiter } from "../support/TokenLimiter";

abstract class BaseAssistant<T> implements AIAssistant<T> {
    abstract getSystemPrompt(): string;

    abstract getPrompt(params?: any): string;

    async process(request: AIAssistantRequest): Promise<AIAssistantResponse<T> | null> {
        const { model, task, files, params } = request;
        console.log(`Processing task:\n>>${task}\n>>with model: ${model}`);

        const systemPrompt = this.getSystemPrompt();
        saveRunInfo(model, task, this.constructor.name, "system_prompt", systemPrompt);

        const basePrompt = this.getPrompt();

        // enforce model token limit
        const { totalTokens, allowedFiles } = TokenLimiter.applyTokenLimit(
            model,
            systemPrompt + basePrompt,
            files
        );

        // construct final prompt with allowed files
        const allowedFilesContent = allowedFiles
            .map((file) => `File: ${file.path}\n${file.content}`)
            .join("\n---\n");

        // create final params
        const extendedParams = {
            ...params,
            taskDescription: task,
            existingCodeFiles: allowedFilesContent,
        };

        // interpolate all keys in the params
        const finalPrompt = Object.keys(extendedParams).reduce((acc, key) => {
            return acc.replace(`[[${key.toUpperCase()}]]`, extendedParams[key]);
        }, basePrompt);

        saveRunInfo(model, task, this.constructor.name, "user_prompt", finalPrompt);

        // generate response
        const aiResponse = await this.generateResponse(model, systemPrompt, finalPrompt);
        if (!aiResponse) {
            return null;
        }
        saveRunInfo(
            model,
            task,
            this.constructor.name,

            "ai_response",
            aiResponse.response
        );

        let parsed = null;
        // parse the response to specifications
        try {
            parsed = parseYaml(aiResponse.response) as T;
            saveRunInfo(model, task, this.constructor.name, "ai_response", parsed, "yaml");
        } catch (error) {
            console.error("Error parsing AI response:", error);
        }

        return {
            ...aiResponse,
            response: parsed,
            responseStr: aiResponse.response,
            calculatedTokens: totalTokens,
        };
    }

    protected async generateResponse(
        model: string,
        systemPrompt: string,
        prompt: string
    ): Promise<AIResponse | null> {
        // pick the ai model
        const aiService =
            model === LLM_MODELS.OPENAI_GPT_4O_MINI || LLM_MODELS.OPENAI_GPT_4O
                ? new OpenAIService()
                : new ClaudeAIService();

        // generate code
        const { response, inputTokens, outputTokens, cost } = await aiService.generateResponse(
            systemPrompt,
            prompt
        );

        return {
            response,
            inputTokens,
            outputTokens,
            cost,
        };
    }
}

export { BaseAssistant };
