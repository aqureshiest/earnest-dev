import { LLMS } from "./llmInfo";

export const calculateLLMCost = (model: any, inputTokens: number, outputTokens: number) => {
    let LLM;

    // if model is a string, find the model in LLMS
    if (typeof model === "string") {
        LLM = LLMS.find((m) => m.model === model);
    } else {
        LLM = model;
    }

    if (!LLM) {
        throw new Error(`LLM {llm} not found`);
    }

    // cost per 1M tokens
    const inputCost = (inputTokens / 1000000) * LLM.inputCost;
    const outputCost = (outputTokens / 1000000) * LLM.outputCost;

    // print cost
    console.log(`Input cost: $${inputCost.toFixed(6)}`);
    console.log(`Output cost: $${outputCost.toFixed(6)}`);

    return { inputCost, outputCost };
};
