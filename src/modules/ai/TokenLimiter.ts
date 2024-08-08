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

    static async tokenizeFiles(files: FileDetails[]) {
        return files
            .map((file) => {
                // no need to tokenize if tokene count is already there
                if (file.tokenCount) {
                    return file;
                }

                console.log("Tokenizing file >>", file.path);
                const tokens = encode(file.content);
                return {
                    ...file,
                    tokenCount: tokens.length,
                };
            })
            .filter((file) => file.tokenCount! > 0 && file.tokenCount! < 8000);
    }
}
