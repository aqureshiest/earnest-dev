import { LLM_MODELS } from "@/modules/utils/llmInfo";
import { BaseAIService } from "./BaseAIService";
import { OpenAIService } from "./OpenAIService";
import { ClaudeAIService } from "./ClaudeAIService";

class AIServiceFactory {
    static createAIService(model: string): BaseAIService {
        if (model === LLM_MODELS.OPENAI_GPT_4O_MINI || model === LLM_MODELS.OPENAI_GPT_4O) {
            return new OpenAIService(model);
        } else if (
            model === LLM_MODELS.ANTHROPIC_CLAUDE_3_HAIKU ||
            model === LLM_MODELS.ANTHROPIC_CLAUDE_3_5_SONNET
        ) {
            return new ClaudeAIService(model);
        } else {
            throw new Error(`Model ${model} not supported`);
        }
    }
}

export { AIServiceFactory };
