import OpenAI from "openai";
import { calculateLLMCost } from "../../utilities/llmCost";
import { LLM_MODELS } from "../../utilities/llmInfo";

export class OpenAIService {
    private openai: OpenAI;
    private model: any;

    constructor(model: string = LLM_MODELS.OPENAI_GPT_4O_MINI) {
        this.openai = new OpenAI();
        this.model = model;
    }

    async generateResponse(systemPrompt: string, prompt: string): Promise<AIResponse> {
        try {
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
                temperature: 0,
            });

            const response = completion.choices[0]?.message?.content?.trim();
            if (!response) {
                throw new Error("No response generated.");
            }

            console.log("Plan usage", completion.usage);
            const { inputCost, outputCost } = calculateLLMCost(
                this.model,
                completion.usage?.prompt_tokens || 0,
                completion.usage?.completion_tokens || 0
            );

            return {
                response,
                inputTokens: completion.usage?.prompt_tokens || 0,
                outputTokens: completion.usage?.completion_tokens || 0,
                cost: inputCost + outputCost,
            };
        } catch (error) {
            console.error("Error generating AI response:", error);
            throw error;
        }
    }
}
