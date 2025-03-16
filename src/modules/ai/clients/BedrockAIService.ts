import { calculateLLMCost } from "@/modules/utils/llmCost";
import { LLM_MODELS, LLMS } from "@/modules/utils/llmInfo";
import { AIResponse, BaseAIService } from "./BaseAIService";
import chalk from "chalk";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

export class BedrockAIService extends BaseAIService {
    private client: BedrockRuntimeClient;

    constructor(model: string = LLM_MODELS.AWS_BEDROCK_CLAUDE_35_SONNET_V2.id) {
        super(model);
        this.client = new BedrockRuntimeClient({
            region: process.env.AWS_REGION || "us-east-1",
        });
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
                throw new Error(`LLM ${this.model} not found`);
            }

            const command = new InvokeModelCommand({
                modelId: this.model,
                contentType: "application/json",
                accept: "application/json",
                body: JSON.stringify({
                    anthropic_version: "bedrock-2023-05-31",
                    max_tokens: LLM.maxOutputTokens,
                    system: systemPrompt,
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0,
                }),
            });

            const completion = await this.client.send(command);
            const responseData = JSON.parse(new TextDecoder().decode(completion.body));

            if (!responseData.content || responseData.content.length === 0) {
                throw new Error("No response content found");
            }

            const content = responseData.content[0]?.text;
            if (!content) {
                throw new Error("No text content in response");
            }

            const { inputCost, outputCost } = calculateLLMCost(
                this.model,
                responseData.usage.input_tokens,
                responseData.usage.output_tokens
            );

            const result: AIResponse = {
                response: content,
                inputTokens: responseData.usage.input_tokens || 0,
                outputTokens: responseData.usage.output_tokens || 0,
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
        image: Buffer,
        media_type?: "image/png" | "application/pdf"
    ): Promise<AIResponse> {
        throw new Error("BedrockAIService does not support image generation.");
    }
}
