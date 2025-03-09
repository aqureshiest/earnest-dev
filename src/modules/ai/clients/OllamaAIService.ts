import { LLM_MODELS, LLMS } from "../../utils/llmInfo";
import { BaseAIService } from "./BaseAIService";
import chalk from "chalk";

interface OllamaResponse {
    model: string;
    created_at: string;
    response: string;
    done: boolean;
    total_duration: number;
    load_duration: number;
    prompt_eval_count: number;
    prompt_eval_duration: number;
    eval_count: number;
    eval_duration: number;
}

export class OllamaAIService extends BaseAIService {
    private baseUrl: string;

    constructor(
        model: string = LLM_MODELS.OLLAMA_LLAMA.id,
        baseUrl: string = "http://localhost:11434"
    ) {
        super(model);
        this.baseUrl = baseUrl;
    }

    async generateResponse(systemPrompt: string, prompt: string): Promise<AIResponse> {
        console.log(chalk.blue("----------------- Ollama Service -----------------"));
        console.log("> ", systemPrompt);
        console.log(
            "> ",
            prompt.replace(
                /<existing_codebase>[\s\S]*<\/existing_codebase>/g,
                "<existing_codebase>.....</existing_codebase>"
            )
        );
        console.log(chalk.blue("-------------------------------------------------"));

        const cacheKey = this.getCacheKey(this.model, systemPrompt, prompt);
        const cachedResponse = await this.getCachedResponse(cacheKey);
        if (cachedResponse) {
            console.log(
                chalk.green(this.constructor.name, "Using cached response for model", this.model)
            );
            console.log(chalk.green("--- Ollama Cached Response ---"));
            console.log("response", cachedResponse.response);
            console.log(chalk.green("-----------------------"));
            return cachedResponse;
        }

        try {
            const LLM = LLMS.find((m) => m.model === this.model);
            if (!LLM) {
                throw new Error(`LLM ${this.model} not found`);
            }

            console.log(this.constructor.name, "Generating response for model", this.model);

            const response = await fetch(`${this.baseUrl}/api/generate`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: this.model,
                    prompt: `${systemPrompt}\n\n${prompt}`,
                    stream: false,
                    options: {
                        temperature: 0,
                        num_predict: LLM.maxOutputTokens,
                    },
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const ollamaResponse: OllamaResponse = await response.json();
            const generatedResponse = ollamaResponse.response.trim();

            console.log("--- Ollama Response ---");
            console.log("response", generatedResponse);
            console.log("-----------------------");

            if (!generatedResponse) {
                throw new Error("No response generated.");
            }

            // Ollama doesn't provide token counts directly, so we'll estimate
            // This is a very rough estimation - you might want to implement a proper tokenizer
            const estimatedInputTokens = Math.ceil((systemPrompt.length + prompt.length) / 4);
            const estimatedOutputTokens = Math.ceil(generatedResponse.length / 4);

            // Calculate costs - adjust pricing as needed for your Ollama setup
            // Since Ollama is free and runs locally, you might set this to 0
            const result: AIResponse = {
                response: generatedResponse,
                inputTokens: estimatedInputTokens,
                outputTokens: estimatedOutputTokens,
                cost: 0, // Local inference is free
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
