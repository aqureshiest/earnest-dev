export type LLMModel = {
    id: string;
    name: string;
};

// Define specific keys for LLM_MODELS
export type LLMModelKey =
    | "OPENAI_O3_MINI"
    | "OPENAI_GPT_4O"
    | "OPENAI_GPT_4O_MINI"
    | "ANTHROPIC_CLAUDE_3_7_SONNET"
    | "ANTHROPIC_CLAUDE_3_5_HAIKU_NEW"
    | "AWS_BEDROCK_CLAUDE_37_SONNET"
    | "AWS_BEDROCK_CLAUDE_35_HAIKU_V2"
    | "GEMINI_2_5_EXP_BUILD";
// | 'OLLAMA_LLAMA';

export const LLM_MODELS: Record<LLMModelKey, LLMModel> = {
    OPENAI_O3_MINI: {
        id: "o3-mini",
        name: "OpenAI O3 Mini",
    },
    OPENAI_GPT_4O: {
        id: "gpt-4o",
        name: "OpenAI GPT-4.0",
    },
    OPENAI_GPT_4O_MINI: {
        id: "gpt-4o-mini",
        name: "OpenAI GPT-4.0 Mini",
    },
    ANTHROPIC_CLAUDE_3_7_SONNET: {
        id: "claude-3-7-sonnet-20250219",
        name: "Anthropic Claude 3.7 Sonnet",
    },
    ANTHROPIC_CLAUDE_3_5_HAIKU_NEW: {
        id: "claude-3-5-haiku-20241022",
        name: "Anthropic Claude 3.5 Haiku New",
    },
    AWS_BEDROCK_CLAUDE_37_SONNET: {
        id: "us.anthropic.claude-3-7-sonnet-20250219-v1:0",
        name: "AWS Bedrock Claude 3.7 Sonnet",
    },
    AWS_BEDROCK_CLAUDE_35_HAIKU_V2: {
        id: "us.anthropic.claude-3-5-haiku-20241022-v1:0",
        name: "AWS Bedrock Claude 3.5 Haiku V2",
    },
    GEMINI_2_5_EXP_BUILD: {
        id: "gemini-2.5-pro-exp-03-25",
        name: "Google Gemini 2.5 Experimental Build",
    },
    // OLLAMA_LLAMA: {
    //     id: "llama3:latest",
    //     name: "OLLama Llama",
    // },
};

export type LLM = {
    model: string;
    inputCost: number;
    outputCost: number;
    maxInputTokens: number;
    maxOutputTokens: number;
    tokenPaddingFactor?: number;
};

export const LLMS: LLM[] = [
    // OpenAI
    {
        model: LLM_MODELS.OPENAI_O3_MINI.id,
        inputCost: 1.1,
        outputCost: 4.4,
        maxInputTokens: 200000,
        maxOutputTokens: 32000, // actually its 100,000
        tokenPaddingFactor: 1.05,
    },
    {
        model: LLM_MODELS.OPENAI_GPT_4O.id,
        inputCost: 2.5,
        outputCost: 10,
        maxInputTokens: 128000,
        maxOutputTokens: 16384,
        tokenPaddingFactor: 1.05,
    },
    {
        model: LLM_MODELS.OPENAI_GPT_4O_MINI.id,
        inputCost: 0.15,
        outputCost: 0.6,
        maxInputTokens: 128000,
        maxOutputTokens: 16384,
        tokenPaddingFactor: 1.05,
    },
    // Anthropic
    {
        model: LLM_MODELS.ANTHROPIC_CLAUDE_3_5_HAIKU_NEW.id,
        inputCost: 0.8,
        outputCost: 4,
        maxInputTokens: 200000,
        maxOutputTokens: 8192,
        tokenPaddingFactor: 1.18,
    },
    {
        model: LLM_MODELS.ANTHROPIC_CLAUDE_3_7_SONNET.id,
        inputCost: 3,
        outputCost: 15,
        maxInputTokens: 200000,
        maxOutputTokens: 8192,
        tokenPaddingFactor: 1.18,
    },
    // Gemini
    {
        model: LLM_MODELS.GEMINI_2_5_EXP_BUILD.id,
        inputCost: 0,
        outputCost: 0,
        maxInputTokens: 200000,
        maxOutputTokens: 25000,
        tokenPaddingFactor: 1,
    },
    // AWS Bedrock
    {
        model: LLM_MODELS.AWS_BEDROCK_CLAUDE_37_SONNET.id,
        inputCost: 3,
        outputCost: 15,
        maxInputTokens: 200000,
        maxOutputTokens: 25000,
        tokenPaddingFactor: 1.18,
    },
    {
        model: LLM_MODELS.AWS_BEDROCK_CLAUDE_35_HAIKU_V2.id,
        inputCost: 1,
        outputCost: 5,
        maxInputTokens: 200000,
        maxOutputTokens: 8192,
        tokenPaddingFactor: 1.18,
    },
    // OLLama
    // {
    //     model: LLM_MODELS.OLLAMA_LLAMA.id,
    //     inputCost: 0,
    //     outputCost: 0,
    //     maxInputTokens: 20000,
    //     maxOutputTokens: 4096,
    //     tokenPaddingFactor: 1,
    // },
];
