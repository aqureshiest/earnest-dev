import { LLM_MODELS } from "@/modules/utils/llmInfo";
import { BaseAIService } from "./BaseAIService";
import { OpenAIService } from "./OpenAIService";
import { ClaudeAIService } from "./ClaudeAIService";
import { GeminiAIService } from "./GeminiAIService";
import { BedrockAIService } from "./BedrockAIService";

class AIServiceFactory {
    static createAIService(model: string): BaseAIService {
        switch (model) {
            case LLM_MODELS.OPENAI_GPT_4O_MINI.id:
            case LLM_MODELS.OPENAI_GPT_4O.id:
                return new OpenAIService(model);
            case LLM_MODELS.ANTHROPIC_CLAUDE_3_HAIKU.id:
            case LLM_MODELS.ANTHROPIC_CLAUDE_3_5_SONNET.id:
            case LLM_MODELS.ANTHROPIC_CLAUDE_3_5_SONNET_NEW.id:
            case LLM_MODELS.ANTHROPIC_CLAUDE_3_5_HAIKU_NEW.id:
                return new ClaudeAIService(model);
            case LLM_MODELS.GEMINI_1_5_FLASH.id:
                return new GeminiAIService(model);
            case LLM_MODELS.AWS_BEDROCK_CLAUDE_35_SONNET_V2.id:
            case LLM_MODELS.AWS_BEDROCK_CLAUDE_35_HAIKU_V2.id:
                return new BedrockAIService(model);
            default:
                throw new Error(`Model ${model} not supported`);
        }
    }
}

export { AIServiceFactory };
