import { calculateLLMCost } from "@/modules/utils/llmCost";
import { LLM_MODELS, LLMS } from "@/modules/utils/llmInfo";
import { AIResponse, BaseAIService } from "./BaseAIService";
import chalk from "chalk";
import { GoogleGenerativeAI } from "@google/generative-ai";

export class GeminiAIService extends BaseAIService {
    private gemini;

    constructor(model: string = LLM_MODELS.GEMINI_1_5_FLASH.id) {
        super(model);
        this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
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

            const LLM = LLMS.find((m) => m.model === this.model);
            if (!LLM) {
                throw new Error(`LLM {this.model} not found`);
            }

            const model = this.gemini.getGenerativeModel({
                model: LLM.model,
                systemInstruction: systemPrompt,
            });

            const completion = await model.generateContent({
                contents: [
                    {
                        role: "user",
                        parts: [
                            {
                                text: prompt,
                            },
                        ],
                    },
                ],
                generationConfig: {
                    maxOutputTokens: LLM.maxOutputTokens,
                    temperature: 0,
                },
            });

            if (!completion) {
                throw new Error("No response generated.");
            }

            const response = completion.response.text();

            console.log("response usage", completion.response.usageMetadata);
            const { inputCost, outputCost } = calculateLLMCost(
                this.model,
                completion.response.usageMetadata?.promptTokenCount || 0,
                completion.response.usageMetadata?.candidatesTokenCount || 0
            );

            const result: AIResponse = {
                response,
                inputTokens: completion.response.usageMetadata?.promptTokenCount || 0,
                outputTokens: completion.response.usageMetadata?.candidatesTokenCount || 0,
                cost: inputCost + outputCost,
            };

            await this.cacheResponse(cacheKey, result);
            return result;
        } catch (error) {
            this.logError("Error generating AI response:", error);
            throw error;
        }
    }

    generateImageResponse(
        systemPrompt: string,
        prompt: string,
        image: Buffer | ArrayBuffer
    ): Promise<AIResponse> {
        throw new Error("Method not implemented.");
    }
}
