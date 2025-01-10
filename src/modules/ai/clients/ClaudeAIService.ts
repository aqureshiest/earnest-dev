import { calculateLLMCost } from "@/modules/utils/llmCost";
import { LLM_MODELS, LLMS } from "@/modules/utils/llmInfo";
import Anthropic from "@anthropic-ai/sdk";
import { BaseAIService } from "./BaseAIService";
import chalk from "chalk";

export class ClaudeAIService extends BaseAIService {
    private anthropic: Anthropic;

    constructor(model: string = LLM_MODELS.ANTHROPIC_CLAUDE_3_5_HAIKU_NEW.id) {
        super(model);
        this.anthropic = new Anthropic();
    }

    async generateResponse(systemPrompt: string, prompt: string): Promise<AIResponse> {
        const cacheKey = this.getCacheKey(this.model, systemPrompt, prompt);
        const cachedResponse = await this.getCachedResponse(cacheKey);
        if (cachedResponse) {
            console.log(
                chalk.green(this.constructor.name, "Using cached response for model", this.model)
            );
            return cachedResponse;
        }

        try {
            console.log(this.constructor.name, "Generating response for model", this.model);
            console.log("system prompt", systemPrompt);
            console.log("user prompt", prompt);

            const LLM = LLMS.find((m) => m.model === this.model);
            if (!LLM) {
                throw new Error(`LLM {this.model} not found`);
            }

            const completion = await this.anthropic.messages.create(
                {
                    model: this.model,
                    max_tokens: LLM.maxOutputTokens,
                    system: systemPrompt,
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0,
                },
                {
                    headers: {
                        "anthropic-beta": "max-tokens-3-5-sonnet-2024-07-15",
                    },
                }
            );

            const response =
                completion.content[0]?.type == "text" ? completion.content[0].text : "";
            if (!response) {
                throw new Error("No response generated.");
            }

            console.log("response usage", completion.usage);
            const { inputCost, outputCost } = calculateLLMCost(
                this.model,
                completion.usage?.input_tokens,
                completion.usage?.output_tokens
            );

            const result: AIResponse = {
                response,
                inputTokens: completion.usage?.input_tokens || 0,
                outputTokens: completion.usage?.output_tokens || 0,
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
