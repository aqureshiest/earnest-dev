import { encode } from "gpt-tokenizer";
import { LLMS } from "../utilities/llmInfo";

export class TokenLimiter {
    static applyTokenLimit(model: string, prompt: string, files: FileDetails[]) {
        // get LLM info
        const LLM: any = LLMS.find((m) => m.model === model);

        // start with token length of the prompt
        let totalTokens = encode(prompt).length;

        const allowedFiles = [];
        // add files to the prompt
        for (const file of files) {
            const contents = `File: ${file.path}\n${file.content}`;
            // keep adding to token length
            if (totalTokens + file.tokenCount < LLM.maxInputTokens) {
                totalTokens += file.tokenCount;
                allowedFiles.push(file);
            } else break;
        }

        return {
            totalTokens,
            allowedFiles,
        };
    }
}
