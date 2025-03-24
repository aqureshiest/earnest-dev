import {
    BedrockRuntimeClient,
    InvokeModelCommand,
    InvokeModelWithResponseStreamCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { calculateLLMCost } from "../../utils/llmCost";
import { LLM_MODELS, LLMS } from "../../utils/llmInfo";
import { BaseAIService, AIResponse } from "./BaseAIService";

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
        this.logServiceHeader("Bedrock Service");
        this.logPrompts(systemPrompt, prompt);

        const cacheKey = this.getCacheKey(this.model, systemPrompt, prompt);

        // If no streaming is needed, use cached response if available
        if (!onToken) {
            const cachedResponse = await this.getCachedResponse(cacheKey);
            if (cachedResponse) {
                this.logCacheHit(this.constructor.name);
                this.logResponse(cachedResponse.response, "Bedrock Cached");
                return cachedResponse;
            }
        }

        try {
            const LLM = LLMS.find((m) => m.model === this.model);
            if (!LLM) {
                throw new Error(`LLM ${this.model} not found`);
            }

            // The model ID is already correct for Bedrock
            const modelId = this.model;

            // Build the request body based on the model type
            const requestBody = this.getRequestBodyForModel(
                modelId,
                systemPrompt,
                prompt,
                LLM.maxOutputTokens
            );

            // If we have an onToken callback, use streaming mode
            if (onToken) {
                let fullResponse = "";

                // Create streaming request
                const command = new InvokeModelWithResponseStreamCommand({
                    modelId,
                    contentType: "application/json",
                    accept: "application/json",
                    body: JSON.stringify(requestBody),
                });

                const response = await this.bedrockClient.send(command);

                // Process the streaming response
                if (response.body) {
                    for await (const chunk of response.body) {
                        if (chunk.chunk?.bytes) {
                            const chunkData = JSON.parse(Buffer.from(chunk.chunk.bytes).toString());
                            const content = this.extractContentFromChunk(modelId, chunkData);

                            if (content) {
                                fullResponse += content;

                                // Call the onToken callback
                                onToken(content);
                            }
                        }
                    }
                }

                this.logResponse(fullResponse, "Bedrock Streaming");

                if (!fullResponse) {
                    throw new Error("No response generated.");
                }

                // Calculate tokens only once at the end of streaming
                const inputTokens = this.estimateTokenCount(systemPrompt + prompt);
                const outputTokens = this.estimateTokenCount(fullResponse);

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
                const command = new InvokeModelCommand({
                    body: JSON.stringify(requestBody),
                    contentType: "application/json",
                    accept: "application/json",
                    modelId,
                });

                const response = await this.bedrockClient.send(command);

                if (!response.body) {
                    throw new Error("No response body returned from Bedrock");
                }

                const responseJson = JSON.parse(new TextDecoder().decode(response.body));

                // Extract the response text based on the model type
                const responseText = this.extractResponseText(modelId, responseJson);

                if (!responseText) {
                    throw new Error("No response text in Bedrock response");
                }

                this.logResponse(responseText, "Bedrock");

                const { inputCost, outputCost } = calculateLLMCost(
                    this.model,
                    responseJson.usage.input_tokens,
                    responseJson.usage.output_tokens
                );

                const result: AIResponse = {
                    response: responseText,
                    inputTokens: responseJson.usage.input_tokens,
                    outputTokens: responseJson.usage.output_tokens,
                    cost: inputCost + outputCost,
                };

                // Cache the response
                await this.cacheResponse(cacheKey, result);
                return result;
            }
        } catch (error) {
            this.logError("Error generating Bedrock response:", error);
            throw error;
        }
    }

    // Builds appropriate request body based on the model
    private getRequestBodyForModel(
        modelId: string,
        systemPrompt: string,
        prompt: string,
        maxTokens: number
    ): any {
        if (modelId.includes("anthropic")) {
            // Format for Claude models on Bedrock
            return {
                anthropic_version: "bedrock-2023-05-31",
                max_tokens: maxTokens,
                system: systemPrompt,
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: prompt,
                            },
                        ],
                    },
                ],
                temperature: 0,
            };
        }

        return {};
    }

    // Extracts content from streaming chunks based on model type
    private extractContentFromChunk(modelId: string, chunkData: any): string {
        if (modelId.includes("anthropic")) {
            // For Claude models
            if (
                chunkData.type === "content_block_delta" &&
                chunkData.delta?.type === "text_delta"
            ) {
                return chunkData.delta.text || "";
            }
        }

        return "";
    }

    // Extracts response text from non-streaming response based on model type
    private extractResponseText(modelId: string, responseJson: any): string {
        if (modelId.includes("anthropic")) {
            // For Claude models
            return responseJson.content?.[0]?.text || "";
        }

        return "";
    }

    private estimateTokenCount(text: string): number {
        // Simple estimation - can be replaced with a more accurate tokenizer
        return Math.ceil(text.length / 4);
    }

    generateImageResponse(
        _systemPrompt: string,
        _prompt: string,
        _image: Buffer,
        _media_type: "image/png" | "application/pdf"
    ): Promise<AIResponse> {
        throw new Error("Method not implemented.");
    }
}
