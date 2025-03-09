import { calculateLLMCost } from "@/modules/utils/llmCost";
import { LLM_MODELS, LLMS } from "@/modules/utils/llmInfo";
import Anthropic from "@anthropic-ai/sdk";
import { BaseAIService } from "./BaseAIService";

export class ClaudeAIService extends BaseAIService {
    private anthropic: Anthropic;

    constructor(model: string = LLM_MODELS.ANTHROPIC_CLAUDE_3_5_HAIKU_NEW.id) {
        super(model);
        this.anthropic = new Anthropic();
    }

    async generateResponse(systemPrompt: string, prompt: string): Promise<AIResponse> {
        this.logServiceHeader("Claude Service");
        this.logPrompts(systemPrompt, prompt);

        const cacheKey = this.getCacheKey(this.model, systemPrompt, prompt);
        const cachedResponse = await this.getCachedResponse(cacheKey);
        if (cachedResponse) {
            this.logCacheHit(this.constructor.name);
            this.logResponse(cachedResponse.response, "Claude Cached");
            return cachedResponse;
        }

        try {
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
                }
                // {
                //     headers: {
                //         "anthropic-beta": "max-tokens-3-5-sonnet-2024-07-15",
                //     },
                // }
            );

            const response =
                completion.content[0]?.type == "text" ? completion.content[0].text : "";
            if (!response) {
                throw new Error("No response generated.");
            }
            this.logResponse(response, "Claude");

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

    async generateImageResponse(
        systemPrompt: string,
        textPrompt: string,
        image: Buffer
        // media_type: string = "image/jpeg" | "image/png" | "image/gif" | "image/webp"
    ): Promise<AIResponse> {
        this.logServiceHeader("Claude Image Service");
        this.logPrompts(systemPrompt, textPrompt);

        // Create cache key including image hash
        const imageHash = require("crypto").createHash("sha256").update(image).digest("hex");
        const cacheKey = this.getCacheKey(this.model, systemPrompt, textPrompt + imageHash);

        const cachedResponse = await this.getCachedResponse(cacheKey);
        if (cachedResponse) {
            this.logCacheHit(this.constructor.name);
            return cachedResponse;
        }

        try {
            const LLM = LLMS.find((m) => m.model === this.model);
            if (!LLM) {
                throw new Error(`LLM ${this.model} not found`);
            }

            const completion = await this.anthropic.messages.create(
                {
                    model: this.model,
                    max_tokens: LLM.maxOutputTokens,
                    system: systemPrompt,
                    messages: [
                        {
                            role: "user",
                            content: [
                                {
                                    type: "text",
                                    text: textPrompt,
                                },
                                {
                                    type: "image",
                                    source: {
                                        type: "base64",
                                        media_type: "image/png",
                                        data: image.toString("base64"),
                                    },
                                },
                            ],
                        },
                    ],
                    temperature: 0,
                },
                {
                    headers: {
                        "anthropic-beta": "max-tokens-3-5-sonnet-2024-07-15",
                    },
                }
            );

            const response =
                completion.content[0]?.type === "text" ? completion.content[0].text : "";
            if (!response) {
                throw new Error("No response generated for image analysis.");
            }

            this.logResponse(response, "Image Analysis");

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
            console.error("Error analyzing image:", error);
            throw error;
        }
    }
}
