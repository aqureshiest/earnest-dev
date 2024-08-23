import { encode } from "gpt-tokenizer";
import { LLMS } from "../../utilities/llmInfo";
import { formatFiles } from "@/modules/utilities/formatFiles";

export class TokenLimiter {
    tokenizeFiles(files: FileDetails[]) {
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

    applyTokenLimit(model: string, prompt: string, files: FileDetails[]) {
        // get LLM info
        const LLM: any = LLMS.find((m) => m.model === model);

        // start with token length of the prompt
        let totalTokens = encode(prompt).length * 1.4;

        const allowedFiles = [];
        let index = 0;
        // add files to the prompt
        for (const file of files) {
            const contents = formatFiles([file]);
            let fileTokens = file.tokenCount || encode(contents).length * 1.4;

            // keep adding to token length
            if (totalTokens + fileTokens < LLM.maxInputTokens - 500) {
                totalTokens += fileTokens;
                allowedFiles.push(file);
            } else {
                console.log(`Skipping files past ${index} index in files list due to token limit`);
                break;
            }

            index++;
        }

        return {
            totalTokens,
            allowedFiles,
        };
    }
}
