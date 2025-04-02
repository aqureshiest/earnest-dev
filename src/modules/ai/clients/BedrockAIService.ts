import {
    BedrockRuntimeClient,
    ConverseCommand,
    ConverseCommandInput,
    ContentBlock,
    ConverseStreamCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { calculateLLMCost } from "../../utils/llmCost";
import { LLM_MODELS, LLMS } from "../../utils/llmInfo";
import { BaseAIService, AIResponse } from "./BaseAIService";
import { createHash } from "crypto";

export class BedrockAIService extends BaseAIService {
    private bedrockClient: BedrockRuntimeClient;

    constructor(model: string = LLM_MODELS.AWS_BEDROCK_CLAUDE_37_SONNET.id) {
        super(model);
        this.bedrockClient = new BedrockRuntimeClient({
            region: process.env.AWS_REGION || "us-east-1",
        });
    }

    async generateResponse(
        systemPrompt: string,
        prompt: string,
        onToken?: (token: string) => void
    ): Promise<AIResponse> {
        this.logServiceHeader("Bedrock Converse Service");
        this.logPrompts(systemPrompt, prompt);

        const cacheKey = this.getCacheKey(this.model, systemPrompt, prompt);

        // If no streaming is needed, use cached response if available
        if (!onToken) {
            const cachedResponse = await this.getCachedResponse(cacheKey);
            if (cachedResponse) {
                this.logCacheHit(this.constructor.name);
                this.logResponse(cachedResponse.response, "Bedrock Converse Cached");
                return cachedResponse;
            }
        }

        try {
            const LLM = LLMS.find((m) => m.model === this.model);
            if (!LLM) {
                throw new Error(`LLM ${this.model} not found`);
            }

            // Create Converse input for text prompt
            const converseInput: ConverseCommandInput = {
                modelId: this.model,
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                text: prompt,
                            },
                        ],
                    },
                ],
                system: [
                    {
                        text: systemPrompt,
                    },
                ],
                inferenceConfig: {
                    maxTokens: LLM.maxOutputTokens,
                    temperature: 0,
                },
            };

            // If we have an onToken callback, use streaming mode
            if (onToken) {
                let fullResponse = "";
                let inputTokens = 0;
                let outputTokens = 0;

                // Create streaming request
                const command = new ConverseStreamCommand(converseInput);
                const response = await this.bedrockClient.send(command);

                // Process the streaming response
                if (response.stream) {
                    for await (const chunk of response.stream) {
                        if (chunk.contentBlockDelta?.delta?.text) {
                            const content = chunk.contentBlockDelta.delta.text;
                            fullResponse += content;
                            onToken(content);
                        } else if (chunk.metadata) {
                            // Extract token usage when available
                            inputTokens = chunk.metadata.usage?.inputTokens || 0;
                            outputTokens = chunk.metadata.usage?.outputTokens || 0;
                        }
                    }
                }

                this.logResponse(fullResponse, "Bedrock Converse Streaming");

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
            // Otherwise, use the standard non-streaming API
            else {
                const command = new ConverseCommand(converseInput);
                const response = await this.bedrockClient.send(command);

                if (!response.output?.message?.content?.[0]?.text) {
                    throw new Error("No text content in Bedrock response");
                }

                const responseText = response.output.message.content[0].text;
                this.logResponse(responseText, "Bedrock Converse");

                const inputTokens = response.usage?.inputTokens || 0;
                const outputTokens = response.usage?.outputTokens || 0;

                const { inputCost, outputCost } = calculateLLMCost(
                    this.model,
                    inputTokens,
                    outputTokens
                );

                const result: AIResponse = {
                    response: responseText,
                    inputTokens,
                    outputTokens,
                    cost: inputCost + outputCost,
                };

                // Cache the response
                await this.cacheResponse(cacheKey, result);
                return result;
            }
        } catch (error) {
            this.logError("Error generating Bedrock Converse response:", error);
            throw error;
        }
    }

    async generateImageResponse(
        systemPrompt: string,
        prompt: string,
        image: Buffer,
        media_type: "image/png" | "application/pdf"
    ): Promise<AIResponse> {
        this.logServiceHeader("Bedrock Image Service");
        this.logPrompts(systemPrompt, prompt);

        // Create cache key including image hash
        const imageHash = createHash("sha256").update(image).digest("hex");
        const cacheKey = this.getCacheKey(
            this.model,
            systemPrompt,
            prompt + imageHash + media_type
        );

        // Check for cached response
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

            // Determine the document format based on media_type
            let format: string;
            let blockType: string;

            if (media_type === "image/png") {
                format = "png";
                blockType = "image";
            } else if (media_type === "application/pdf") {
                format = "pdf";
                blockType = "document";
            } else {
                throw new Error(`Unsupported media type: ${media_type}`);
            }

            // Create content blocks for the message
            const contentBlocks: ContentBlock[] = [
                {
                    text: prompt,
                },
            ];

            // Add image or document block
            if (blockType === "image") {
                contentBlocks.push({
                    image: {
                        format: format as any,
                        source: {
                            bytes: image,
                        },
                    },
                });
            } else {
                contentBlocks.push({
                    document: {
                        format: format as any,
                        name: "uploaded_document",
                        source: {
                            bytes: image,
                        },
                    },
                });
            }

            const converseInput: ConverseCommandInput = {
                modelId: this.model,
                messages: [
                    {
                        role: "user",
                        content: contentBlocks,
                    },
                ],
                system: [
                    {
                        text: systemPrompt,
                    },
                ],
                inferenceConfig: {
                    maxTokens: LLM.maxOutputTokens,
                    temperature: 0,
                },
            };

            const command = new ConverseCommand(converseInput);
            const response = await this.bedrockClient.send(command);

            if (!response.output?.message?.content?.[0]?.text) {
                throw new Error("No text content in Bedrock response");
            }

            const responseText = response.output.message.content[0].text;
            this.logResponse(responseText, "Bedrock Image");

            const inputTokens = response.usage?.inputTokens || 0;
            const outputTokens = response.usage?.outputTokens || 0;

            const { inputCost, outputCost } = calculateLLMCost(
                this.model,
                inputTokens,
                outputTokens
            );

            const result: AIResponse = {
                response: responseText,
                inputTokens,
                outputTokens,
                cost: inputCost + outputCost,
            };

            // Cache the response
            await this.cacheResponse(cacheKey, result);
            return result;
        } catch (error) {
            this.logError("Error generating Bedrock image response:", error);
            throw error;
        }
    }
}
