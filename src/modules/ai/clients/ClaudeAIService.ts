import { calculateLLMCost } from "@/modules/utilities/llmCost";
import { LLM_MODELS, LLMS } from "@/modules/utilities/llmInfo";
import Anthropic from "@anthropic-ai/sdk";

export class ClaudeAIService {
    private anthropic: Anthropic;
    private model: string;

    constructor(model: string = LLM_MODELS.ANTHROPIC_CLAUDE_3_HAIKU) {
        this.anthropic = new Anthropic();
        this.model = model;
    }

    async generateResponse(systemPrompt: string, prompt: string): Promise<AIResponse> {
        try {
            const LLM = LLMS.find((m) => m.model === this.model);
            if (!LLM) {
                throw new Error(`LLM {this.model} not found`);
            }

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

            console.log("response usage", completion.usage);
            // print LLM call cost
            const { inputCost, outputCost } = calculateLLMCost(
                this.model,
                completion.usage?.input_tokens,
                completion.usage?.output_tokens
            );

            return {
                response,
                inputTokens: completion.usage?.input_tokens || 0,
                outputTokens: completion.usage?.output_tokens || 0,
                cost: inputCost + outputCost,
            };
        } catch (error) {
            console.error("Error generating AI response:", error);
            throw error;
        }
    }
}
