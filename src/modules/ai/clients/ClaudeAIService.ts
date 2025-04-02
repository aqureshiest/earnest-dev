import { calculateLLMCost } from "@/modules/utils/llmCost";
import { LLM_MODELS, LLMS } from "@/modules/utils/llmInfo";
import Anthropic from "@anthropic-ai/sdk";
import { AIResponse, BaseAIService } from "./BaseAIService";
import { createHash } from "crypto";

export class ClaudeAIService extends BaseAIService {
    private anthropic: Anthropic;

    constructor(model: string = LLM_MODELS.ANTHROPIC_CLAUDE_3_5_HAIKU_NEW.id) {
        super(model);
        this.anthropic = new Anthropic();
    }

    async generateResponse(
        systemPrompt: string,
        prompt: string,
        onToken?: (token: string) => void
    ): Promise<AIResponse> {
        this.logServiceHeader("Claude Service");
        this.logPrompts(systemPrompt, prompt);

        const cacheKey = this.getCacheKey(this.model, systemPrompt, prompt);

        // If no streaming is needed, use cached response if available
        if (!onToken) {
            const cachedResponse = await this.getCachedResponse(cacheKey);
            if (cachedResponse) {
                this.logCacheHit(this.constructor.name);
                this.logResponse(cachedResponse.response, "Claude Cached");
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
                const stream = await this.anthropic.messages.create({
                    model: this.model,
                    max_tokens: LLM.maxOutputTokens,
                    system: systemPrompt,
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0,
                    stream: true,
                });

                // Process the stream
                for await (const chunk of stream) {
                    if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
                        const content = chunk.delta.text || "";
                        if (content) {
                            fullResponse += content;

                            // Call the onToken callback
                            onToken(content);
                        }
                    } else if (chunk.type === "message_start") {
                        // Set input tokens once
                        if (chunk.message?.usage.input_tokens && inputTokens === 0) {
                            inputTokens = chunk.message.usage.input_tokens;
                        }
                    } else if (chunk.type === "message_delta") {
                        // set output tokens
                        if (chunk.usage?.output_tokens) {
                            outputTokens = Math.max(outputTokens, chunk.usage.output_tokens);
                        }
                    } else if (chunk.type === "message_stop") {
                        // End of the stream
                        break;
                    }
                }

                this.logResponse(fullResponse, "Claude Streaming");

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
                // Non-streaming mode
                const completion = await this.anthropic.messages.create({
                    model: this.model,
                    max_tokens: LLM.maxOutputTokens,
                    system: systemPrompt,
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0,
                });

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
        this.logServiceHeader("Claude Image Service");
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

            const completion = await this.anthropic.messages.create(
                {
                    model: this.model,
                    max_tokens: LLM.maxOutputTokens,
                    system: systemPrompt,
                    messages: [
                        {
                            role: "user",
                            content: [
                                media_type == "image/png"
                                    ? {
                                          type: "image",
                                          source: {
                                              type: "base64",
                                              media_type,
                                              data: image.toString("base64"),
                                          },
                                      }
                                    : {
                                          type: "document",
                                          source: {
                                              type: "base64",
                                              media_type: "application/pdf",
                                              data: image.toString("base64"),
                                          },
                                      },

                                {
                                    type: "text",
                                    text: textPrompt,
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
            this.logError("Error analyzing image:", error);
            throw error;
        }
    }
}
