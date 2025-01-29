import OpenAI from "openai";
import { calculateLLMCost } from "../../utils/llmCost";
import { LLM_MODELS, LLMS } from "../../utils/llmInfo";
import { BaseAIService } from "./BaseAIService";
import chalk from "chalk";

export class OpenAIService extends BaseAIService {
    private openai: OpenAI;

    constructor(model: string = LLM_MODELS.OPENAI_GPT_4O_MINI.id) {
        super(model);
        this.openai = new OpenAI();
    }

    async generateResponse(systemPrompt: string, prompt: string): Promise<AIResponse> {
        console.log(chalk.blue("----------------- OpenAI Service -----------------"));
        console.log("> ", systemPrompt);
        // print user prompt but condense section <existing_codebase>...</existing_codebase>
        console.log(
            "> ",
            prompt.replace(
                /<existing_codebase>[\s\S]*<\/existing_codebase>/g,
                "<existing_codebase>.....</existing_codebase>"
            )
        );
        console.log(chalk.blue("-------------------------------------------------"));

        const cacheKey = this.getCacheKey(this.model, systemPrompt, prompt);
        const cachedResponse = await this.getCachedResponse(cacheKey);
        if (cachedResponse) {
            console.log(
                chalk.green(this.constructor.name, "Using cached response for model", this.model)
            );
            console.log(chalk.green("--- OpenAI Cached Response ---"));
            console.log("response", cachedResponse.response);
            console.log(chalk.green("-----------------------"));
            return cachedResponse;
        }

        try {
            const LLM = LLMS.find((m) => m.model === this.model);
            if (!LLM) {
                throw new Error(`LLM {this.model} not found`);
            }

            console.log(this.constructor.name, "Generating response for model", this.model);
            const completion = await this.openai.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: systemPrompt,
                    },
                    {
                        role: "user",
                        content: prompt,
                    },
                ],
                model: this.model,
                max_completion_tokens: LLM.maxOutputTokens,
                temperature: 0,
            });

            const response = completion.choices[0]?.message?.content?.trim();
            console.log("--- OpenAI Response ---");
            console.log("response", response);
            console.log("-----------------------");

            if (!response) {
                throw new Error("No response generated.");
            }

            const { inputCost, outputCost } = calculateLLMCost(
                this.model,
                completion.usage?.prompt_tokens || 0,
                completion.usage?.completion_tokens || 0
            );

            const result: AIResponse = {
                response,
                inputTokens: completion.usage?.prompt_tokens || 0,
                outputTokens: completion.usage?.completion_tokens || 0,
                cost: inputCost + outputCost,
            };

            await this.cacheResponse(cacheKey, result);
            return result;
        } catch (error) {
            console.error("Error generating AI response:", error);
            throw error;
        }
    }
}
