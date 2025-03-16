import OpenAI from "openai";
import { calculateLLMCost } from "../../utils/llmCost";
import { LLM_MODELS, LLMS } from "../../utils/llmInfo";
import { BaseAIService, AIResponse } from "./BaseAIService";
import { createHash } from "crypto";

export class OpenAIService extends BaseAIService {
    private openai: OpenAI;

    constructor(model: string = LLM_MODELS.OPENAI_GPT_4O_MINI.id) {
        super(model);
        this.openai = new OpenAI();
    }

    async generateResponse(systemPrompt: string, prompt: string): Promise<AIResponse> {
        this.logServiceHeader("OpenAI Service");
        this.logPrompts(systemPrompt, prompt);

        const cacheKey = this.getCacheKey(this.model, systemPrompt, prompt);
        const cachedResponse = await this.getCachedResponse(cacheKey);

        if (cachedResponse) {
            this.logCacheHit(this.constructor.name);
            this.logResponse(cachedResponse.response, "OpenAI Cached");
            return cachedResponse;
        }

        try {
            const LLM = LLMS.find((m) => m.model === this.model);
            if (!LLM) {
                throw new Error(`LLM ${this.model} not found`);
            }

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
                temperature: this.model.startsWith("o") ? 1 : 0,
            });

            const response = completion.choices[0]?.message?.content?.trim();
            this.logResponse(response, "OpenAI");

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
            this.logError("Error generating AI response:", error);
            throw error;
        }
    }

    async generateImageResponse(
        systemPrompt: string,
        textPrompt: string,
        image: Buffer,
        mediaType: "image/png" | "application/pdf"
    ): Promise<AIResponse> {
        // only supporting image/png for now
        if (mediaType !== "image/png") {
            throw new Error("Unsupported media type. Only 'image/png' is supported.");
        }

        this.logServiceHeader("OpenAI Image Service");
        this.logPrompts(systemPrompt, textPrompt);

        const imageBuffer = Buffer.isBuffer(image) ? image : Buffer.from(image);
        const imageHash = createHash("sha256").update(imageBuffer).digest("hex");
        const cacheKey = this.getCacheKey(
            this.model,
            systemPrompt,
            textPrompt + imageHash + mediaType
        );

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

            const base64Image = image.toString("base64");

            const completion = await this.openai.chat.completions.create({
                model: this.model,
                messages: [
                    {
                        role: "system",
                        content: systemPrompt,
                    },
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: textPrompt,
                            },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:image/png;base64,${base64Image}`,
                                },
                            },
                        ],
                    },
                ],
                max_completion_tokens: LLM.maxOutputTokens,
            });

            const response = completion.choices[0]?.message?.content?.trim();
            this.logResponse(response, "Image Analysis");

            if (!response) {
                throw new Error("No response generated for image analysis.");
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
            this.logError("Error analyzing image:", error);
            throw error;
        }
    }
}
