import { LLM_MODELS } from "@/modules/utils/llmInfo";
import { BaseAIService } from "./BaseAIService";
import { OpenAIService } from "./OpenAIService";
import { ClaudeAIService } from "./ClaudeAIService";
import { GeminiAIService } from "./GeminiAIService";

class AIServiceFactory {
    static createAIService(model: string): BaseAIService {
        switch (model) {
            case LLM_MODELS.OPENAI_GPT_4O_MINI:
            case LLM_MODELS.OPENAI_GPT_4O:
                return new OpenAIService(model);
            case LLM_MODELS.ANTHROPIC_CLAUDE_3_HAIKU:
            case LLM_MODELS.ANTHROPIC_CLAUDE_3_5_SONNET:
                return new ClaudeAIService(model);
            case LLM_MODELS.GEMINI_1_5_FLASH:
                return new GeminiAIService(model);
            default:
                throw new Error(`Model ${model} not supported`);
        }
    }
}

export { AIServiceFactory };
