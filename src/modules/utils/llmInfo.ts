export const LLM_MODELS = {
    OPENAI_GPT_4O: {
        id: "gpt-4o",
        name: "OpenAI GPT-4.0",
    },
    OPENAI_GPT_4O_MINI: {
        id: "gpt-4o-mini",
        name: "OpenAI GPT-4.0 Mini",
    },
    ANTHROPIC_CLAUDE_3_5_SONNET: {
        id: "claude-3-5-sonnet-20240620",
        name: "Anthropic Claude 3.5 Sonnet",
    },
    ANTHROPIC_CLAUDE_3_HAIKU: {
        id: "claude-3-haiku-20240307",
        name: "Anthropic Claude 3 Haiku",
    },
    ANTHROPIC_CLAUDE_3_5_SONNET_NEW: {
        id: "claude-3-5-sonnet-20241022",
        name: "Anthropic Claude 3.5 Sonnet New",
    },
    ANTHROPIC_CLAUDE_3_5_HAIKU_NEW: {
        id: "claude-3-5-haiku-20241022",
        name: "Anthropic Claude 3.5 Haiku New",
    },
    GEMINI_1_5_FLASH: {
        id: "gemini-1.5-flash",
        name: "Google Gemini 1.5 Flash",
    },
    AWS_BEDROCK_CLAUDE_35_SONNET_V2: {
        id: "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
        name: "AWS Bedrock Claude 3.5 Sonnet V2",
    },
    AWS_BEDROCK_CLAUDE_35_HAIKU_V2: {
        id: "us.anthropic.claude-3-5-haiku-20241022-v1:0",
        name: "AWS Bedrock Claude 3.5 Haiku V2",
    },
    OLLAMA_DEEPSEEK: {
        id: "deepseek-r1:latest",
        name: "OLLama DeepSeek",
    },
    OLLAMA_LLAMA: {
        id: "llama3:latest",
        name: "OLLama Llama",
    },
};

export const LLMS = [
    // OpenAI
    {
        model: LLM_MODELS.OPENAI_GPT_4O.id,
        inputCost: 5,
        outputCost: 15,
        maxInputTokens: 50000, //128000
        maxOutputTokens: 4096,
    },
    {
        model: LLM_MODELS.OPENAI_GPT_4O_MINI.id,
        inputCost: 0.15,
        outputCost: 0.6,
        maxInputTokens: 50000, //128000
        maxOutputTokens: 16384,
    },
    // Anthropic
    {
        model: LLM_MODELS.ANTHROPIC_CLAUDE_3_5_SONNET.id,
        inputCost: 3,
        outputCost: 15,
        maxInputTokens: 50000, //200000,
        maxOutputTokens: 4096,
    },
    {
        model: LLM_MODELS.ANTHROPIC_CLAUDE_3_HAIKU.id,
        inputCost: 0.25,
        outputCost: 1.25,
        maxInputTokens: 50000, //200000,
        maxOutputTokens: 4096,
    },
    {
        model: LLM_MODELS.ANTHROPIC_CLAUDE_3_5_SONNET_NEW.id,
        inputCost: 3,
        outputCost: 15,
        maxInputTokens: 50000, //200000,
        maxOutputTokens: 8192,
    },
    {
        model: LLM_MODELS.ANTHROPIC_CLAUDE_3_5_HAIKU_NEW.id,
        inputCost: 1,
        outputCost: 5,
        maxInputTokens: 50000, //200000,
        maxOutputTokens: 8192,
    },
    // Gemini
    {
        model: LLM_MODELS.GEMINI_1_5_FLASH.id,
        inputCost: 0,
        outputCost: 0,
        maxInputTokens: 200000, //200000,
        maxOutputTokens: 4096,
    },
    // AWS Bedrock
    {
        model: LLM_MODELS.AWS_BEDROCK_CLAUDE_35_SONNET_V2.id,
        inputCost: 3,
        outputCost: 15,
        maxInputTokens: 50000, //200000,
        maxOutputTokens: 8192,
    },
    {
        model: LLM_MODELS.AWS_BEDROCK_CLAUDE_35_HAIKU_V2.id,
        inputCost: 1,
        outputCost: 5,
        maxInputTokens: 50000, //200000,
        maxOutputTokens: 8192,
    },
    // OLLama
    {
        model: LLM_MODELS.OLLAMA_DEEPSEEK.id,
        inputCost: 0,
        outputCost: 0,
        maxInputTokens: 20000,
        maxOutputTokens: 4096,
    },
    {
        model: LLM_MODELS.OLLAMA_LLAMA.id,
        inputCost: 0,
        outputCost: 0,
        maxInputTokens: 20000,
        maxOutputTokens: 4096,
    },
];
