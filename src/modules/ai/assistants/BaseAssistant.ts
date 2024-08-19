import { saveRunInfo } from "@/modules/utilities/saveRunInfo";
import { LLM_MODELS } from "../../utilities/llmInfo";
import { ClaudeAIService } from "../clients/ClaudeAIService";
import { OpenAIService } from "../clients/OpenAIService";
import { TokenLimiter } from "../support/TokenLimiter";
import { parseYaml } from "@/modules/utilities/parseYaml";
import { CODEFILES_PLACEHOLDER } from "@/constants";
import { formatFiles } from "@/modules/utilities/formatFiles";
import { parseMarkdown } from "@/modules/utilities/parseMarkdown";

abstract class BaseAssistant<T> implements AIAssistant<T> {
    abstract getSystemPrompt(): string;

    abstract getPrompt(params?: any): string;

    async process(request: AIAssistantRequest): Promise<AIAssistantResponse<T> | null> {
        const { model, task, files, params } = request;
        console.log(`Processing task:\n>>${task}\n>>with model: ${model}`);

        const systemPrompt = this.getSystemPrompt();
        saveRunInfo(model, task, this.constructor.name, "system_prompt", systemPrompt);

        // start with base prompt and unresolved placeholders
        const basePrompt = this.getPrompt();

        // add required keys to the params
        const userParams = {
            ...params,
            taskDescription: task,
        };

        // interpolate all params in the base prompt except existing code files
        const keys = Object.keys(userParams || []).filter(
            (key) => key.toUpperCase() !== CODEFILES_PLACEHOLDER
        );

        const userPrompt = keys.reduce((acc, key) => {
            return acc.replace(`[[${key.toUpperCase()}]]`, userParams[key]);
        }, basePrompt);

        // enforce model token limit to get allowed files
        const { totalTokens, allowedFiles } = TokenLimiter.applyTokenLimit(
            model,
            systemPrompt + userPrompt,
            files
        );

        // construct final prompt with allowed files
        const allowedFilesContent = formatFiles(allowedFiles);

        // now interpolate the existing code files in the prompt
        const finalPromptWithFiles = userPrompt.replace(CODEFILES_PLACEHOLDER, allowedFilesContent);
        saveRunInfo(model, task, this.constructor.name, "user_prompt", finalPromptWithFiles);

        // generate response
        const aiResponse = await this.generateResponse(model, systemPrompt, finalPromptWithFiles);
        if (!aiResponse) {
            return null;
        }
        saveRunInfo(model, task, this.constructor.name, "ai_response", aiResponse.response);

        // parse the response
        let parsed = null;
        try {
            // parse yaml response
            if (aiResponse.response.startsWith("```yaml")) {
                parsed = parseYaml(aiResponse.response) as T;
                saveRunInfo(model, task, this.constructor.name, "ai_response", parsed, "yaml");
            }
            // parse markdown response
            else if (aiResponse.response.startsWith("```markdown")) {
                parsed = parseMarkdown(aiResponse.response) as T;
                saveRunInfo(model, task, this.constructor.name, "ai_response", parsed, "md");
            }
            // parse diff file
            else if (aiResponse.response.startsWith("```diff")) {
                const parsedText = aiResponse.response.match(/```diff([\s\S]*?)```/);
                if (parsedText && parsedText[1]) {
                    parsed = parsedText[1] as T;
                    saveRunInfo(model, task, this.constructor.name, "ai_response_diff", parsed);
                }
            } else {
                // if not yaml or markdown, return the response as string
                parsed = aiResponse.response as T;
            }
        } catch (error) {
            console.error("Error parsing AI response:", error);
            throw error;
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
