import OpenAI from "openai";
import { calculateLLMCost } from "../../utils/llmCost";
import { LLM_MODELS, LLMS } from "../../utils/llmInfo";
import { BaseAIService, AIResponse } from "./BaseAIService";
import { createHash } from "crypto";
import { ResponseInputMessageContentList } from "openai/resources/responses/responses.mjs";

export class OpenAIService extends BaseAIService {
    private openai: OpenAI;

    constructor(model: string = LLM_MODELS.OPENAI_GPT_4O_MINI.id) {
        super(model);
        this.openai = new OpenAI();
    }

    async generateResponse(
        systemPrompt: string,
        prompt: string,
        onToken?: (token: string) => void
    ): Promise<AIResponse> {
        this.logServiceHeader("OpenAI Service");
        this.logPrompts(systemPrompt, prompt);

        const cacheKey = this.getCacheKey(this.model, systemPrompt, prompt);

        // If no streaming is needed, use cached response if available
        if (!onToken) {
            const cachedResponse = await this.getCachedResponse(cacheKey);
            if (cachedResponse) {
                this.logCacheHit(this.constructor.name);
                this.logResponse(cachedResponse.response, "OpenAI Cached");
                return cachedResponse;
            }
        }

        try {
            const LLM = LLMS.find((m) => m.model === this.model);
            if (!LLM) {
                throw new Error(`LLM ${this.model} not found`);
            }

            // If we have an onToken callback, use streaming mode
            if (onToken) {
                let fullResponse = "";
                let inputTokens = 0;
                let outputTokens = 0;

                // Create streaming request
                const stream = await this.openai.responses.create({
                    model: this.model,
                    input: [
                        {
                            role: "system",
                            content: systemPrompt,
                        },
                        {
                            role: "user",
                            content: prompt,
                        },
                    ],
                    max_output_tokens: LLM.maxOutputTokens,
                    temperature: this.model.startsWith("o") ? 1 : 0,
                    stream: true,
                });

                // Process the stream
                for await (const chunk of stream) {
                    if (chunk.type == "response.output_text.delta") {
                        const content = chunk.delta || "";
                        if (content) {
                            fullResponse += content;

                            // Call the onToken callback
                            onToken(content);
                        }
                    } else if (chunk.type == "response.completed") {
                        if (chunk.response.usage?.input_tokens) {
                            inputTokens = chunk.response.usage.input_tokens;
                        }
                        if (chunk.response.usage?.output_tokens) {
                            outputTokens = chunk.response.usage.output_tokens;
                        }
                    }
                }

                this.logResponse(fullResponse, "OpenAI Streaming");

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
            }
            // Otherwise, use non-streaming mode
            else {
                const completion = await this.openai.responses.create({
                    input: [
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
                    max_output_tokens: LLM.maxOutputTokens,
                    temperature: this.model.startsWith("o") ? 1 : 0,
                });

                const response = completion.output_text.trim();
                this.logResponse(response, "OpenAI");

                if (!response) {
                    throw new Error("No response generated.");
                }

                const { inputCost, outputCost } = calculateLLMCost(
                    this.model,
                    completion.usage?.input_tokens || 0,
                    completion.usage?.output_tokens || 0
                );

                const result: AIResponse = {
                    response,
                    inputTokens: completion.usage?.input_tokens || 0,
                    outputTokens: completion.usage?.output_tokens || 0,
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
        mediaType: "image/png" | "application/pdf"
    ): Promise<AIResponse> {
        this.logServiceHeader("OpenAI Image/Doc Service");
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

            const contents: ResponseInputMessageContentList =
                mediaType == "image/png"
                    ? [
                          {
                              type: "input_text",
                              text: textPrompt,
                          },
                          {
                              type: "input_image",
                              image_url: `data:image/png;base64,${base64Image}`,
                              detail: "auto",
                          },
                      ]
                    : // application/pdf
                      [
                          {
                              type: "input_file",
                              filename: "document.pdf",
                              file_data: `data:${mediaType};base64,${base64Image}`,
                          },
                          {
                              type: "input_text",
                              text: textPrompt,
                          },
                      ];

            const completion = await this.openai.responses.create({
                model: this.model,
                input: [
                    {
                        role: "system",
                        content: systemPrompt,
                    },
                    {
                        role: "user",
                        content: contents,
                    },
                ],
                max_output_tokens: LLM.maxOutputTokens,
            });

            const response = completion.output_text.trim();
            this.logResponse(response, "Image Analysis");

            if (!response) {
                throw new Error("No response generated for image analysis.");
            }

            const { inputCost, outputCost } = calculateLLMCost(
                this.model,
                completion.usage?.input_tokens || 0,
                completion.usage?.output_tokens || 0
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
            this.logError("Error analyzing image:", error);
            throw error;
        }
    }
}
