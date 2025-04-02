import { calculateLLMCost } from "@/modules/utils/llmCost";
import { LLM_MODELS, LLMS } from "@/modules/utils/llmInfo";
import { AIResponse, BaseAIService } from "./BaseAIService";
import { createPartFromBase64, createUserContent, GoogleGenAI } from "@google/genai";
import { createHash } from "crypto";

export class GeminiAIService extends BaseAIService {
    private ai;

    constructor(model: string = LLM_MODELS.GEMINI_2_5_EXP_BUILD.id) {
        super(model);
        this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_25_API_KEY });
    }

    async generateResponse(
        systemPrompt: string,
        prompt: string,
        onToken?: (token: string) => void // not supporting streaming yet
    ): Promise<AIResponse> {
        this.logServiceHeader("Google Gemini Service");
        this.logPrompts(systemPrompt, prompt);

        const cacheKey = this.getCacheKey(this.model, systemPrompt, prompt);

        // If no streaming is needed, use cached response if available
        if (!onToken) {
            const cachedResponse = await this.getCachedResponse(cacheKey);
            if (cachedResponse) {
                this.logCacheHit(this.constructor.name);
                this.logResponse(cachedResponse.response, "Gemini Cached");
                return cachedResponse;
            }
        }

        try {
            const LLM = LLMS.find((m) => m.model === this.model);
            if (!LLM) {
                throw new Error(`LLM {this.model} not found`);
            }

            if (onToken) {
                let fullResponse = "";
                let inputTokens = 0;
                let outputTokens = 0;

                const response = await this.ai.models.generateContentStream({
                    model: LLM.model,
                    config: {
                        systemInstruction: systemPrompt,
                        maxOutputTokens: LLM.maxOutputTokens,
                        temperature: 0,
                    },
                    contents: [
                        createUserContent({
                            text: prompt,
                        }),
                    ],
                });

                for await (const chunk of response) {
                    if (chunk.text) {
                        fullResponse += chunk.text;
                        onToken(chunk.text);
                    }

                    // Set input tokens once
                    if (chunk.usageMetadata?.promptTokenCount && inputTokens === 0) {
                        inputTokens = chunk.usageMetadata.promptTokenCount;
                    }

                    // Track the highest seen output token count
                    if (chunk.usageMetadata?.candidatesTokenCount) {
                        outputTokens = Math.max(
                            outputTokens,
                            chunk.usageMetadata.candidatesTokenCount
                        );
                    }
                }

                this.logResponse(fullResponse, "Gemini Streaming");

                if (!fullResponse) {
                    throw new Error("No response generated.");
                }

                const { inputCost, outputCost } = calculateLLMCost(
                    this.model,
                    inputTokens,
                    outputTokens
                );

                const result: AIResponse = {
                    response: fullResponse,
                    inputTokens,
                    outputTokens,
                    cost: inputCost + outputCost,
                };

                // Cache the full response
                await this.cacheResponse(cacheKey, result);
                return result;
            } else {
                // Non streaming mode
                const completion = await this.ai.models.generateContent({
                    model: LLM.model,
                    config: {
                        systemInstruction: systemPrompt,
                        maxOutputTokens: LLM.maxOutputTokens,
                        temperature: 0,
                    },
                    contents: [
                        createUserContent({
                            text: prompt,
                        }),
                    ],
                });

                if (!completion || !completion.text) {
                    throw new Error("No response generated.");
                }

                const response = completion.text;
                this.logResponse(response, "Gemini");

                const { inputCost, outputCost } = calculateLLMCost(
                    this.model,
                    completion.usageMetadata?.promptTokenCount || 0,
                    completion.usageMetadata?.candidatesTokenCount || 0
                );

                const result: AIResponse = {
                    response,
                    inputTokens: completion.usageMetadata?.promptTokenCount || 0,
                    outputTokens: completion.usageMetadata?.candidatesTokenCount || 0,
                    cost: inputCost + outputCost,
                };

                await this.cacheResponse(cacheKey, result);
                return result;
            }
        } catch (error) {
            this.logError("Error generating AI response:", error);
            throw error;
        }
    }

    async generateImageResponse(
        systemPrompt: string,
        textPrompt: string,
        image: Buffer,
        media_type?: "image/png" | "application/pdf"
    ): Promise<AIResponse> {
        this.logServiceHeader("Gemini Image Service");
        this.logPrompts(systemPrompt, textPrompt);

        // Create cache key including image hash
        const imageHash = createHash("sha256").update(image).digest("hex");
        const cacheKey = this.getCacheKey(
            this.model,
            systemPrompt,
            textPrompt + imageHash + media_type
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

            if (media_type !== "application/pdf" && media_type !== "image/png") {
                throw new Error("Unsupported media type");
            }

            const completion = await this.ai.models.generateContent({
                model: LLM.model,
                config: {
                    systemInstruction: systemPrompt,
                    maxOutputTokens: LLM.maxOutputTokens,
                    temperature: 0,
                },
                contents: [
                    createUserContent([
                        prompt.toString(),
                        createPartFromBase64(image.toString("base64"), media_type),
                    ]),
                ],
            });

            const response = completion.text;
            if (!response) {
                throw new Error("No response generated for image analysis.");
            }

            this.logResponse(response, "Image Analysis");

            const { inputCost, outputCost } = calculateLLMCost(
                this.model,
                completion.usageMetadata?.promptTokenCount || 0,
                completion.usageMetadata?.candidatesTokenCount || 0
            );

            const result: AIResponse = {
                response,
                inputTokens: completion.usageMetadata?.promptTokenCount || 0,
                outputTokens: completion.usageMetadata?.candidatesTokenCount || 0,
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
