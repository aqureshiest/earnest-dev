export const LLM_MODELS = {
    OPENAI_GPT_4O: "gpt-4o",
    OPENAI_GPT_4O_MINI: "gpt-4o-mini",
    ANTHROPIC_CLAUDE_3_5_SONNET: "claude-3-5-sonnet-20240620",
    ANTHROPIC_CLAUDE_3_HAIKU: "claude-3-haiku-20240307",
};

export const LLMS = [
    // OpenAI
    {
        model: LLM_MODELS.OPENAI_GPT_4O,
        inputCost: 5,
        outputCost: 15,
        maxInputTokens: 128000,
        maxOutputTokens: 4096,
    },
    {
        model: LLM_MODELS.OPENAI_GPT_4O_MINI,
        inputCost: 0.15,
        outputCost: 0.6,
        maxInputTokens: 128000,
        maxOutputTokens: 16384,
    },
    // Anthropic
    {
        model: LLM_MODELS.ANTHROPIC_CLAUDE_3_5_SONNET,
        inputCost: 3,
        outputCost: 15,
        maxInputTokens: 80000, //200000,
        maxOutputTokens: 8192,
    },
    {
        model: LLM_MODELS.ANTHROPIC_CLAUDE_3_HAIKU,
        inputCost: 0.25,
        outputCost: 1.25,
        maxInputTokens: 80000, //200000,
        maxOutputTokens: 4096,
    },
];
