import { encode } from "gpt-tokenizer";
import { LLMS } from "../../utils/llmInfo";
import { formatFiles } from "@/modules/utils/formatFiles";

export class TokenLimiter {
    tokenizeFiles(files: FileDetails[]) {
        return files
            .map((file) => {
                // no need to tokenize if token count is already there
                if (file.tokenCount) {
                    return file;
                }

                // console.log("Tokenizing file >>", file.path);
                const tokens = encode(`${file.path}\n${file.content}`);
                return {
                    ...file,
                    tokenCount: tokens.length,
                };
            })
            .filter((file) => file.tokenCount > 0);
    }

    applyTokenLimit(model: string, prompt: string, files: FileDetails[]) {
        // get LLM info
        const LLM: any = LLMS.find((m) => m.model === model);

        const buffer = 500;
        const allowedTokens = LLM.maxInputTokens - buffer;

        // start with token length of the prompt
        let totalTokens = encode(prompt).length * 1.4;

        const allowedFiles = [];
        let index = 0;
        // add files to the prompt
        for (const file of files) {
            const contents = formatFiles([file]);
            let fileTokens = (file.tokenCount || encode(contents).length) * 1.4;

            // keep adding to token length
            if (totalTokens + fileTokens < allowedTokens) {
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

    splitInChunks(files: FileDetails[], tokenLimit: number) {
        const chunks: FileDetails[] = [];
        let chunk: FileDetails[] = [];
        let chunkTokens = 0;

        for (const file of files) {
            const contents = formatFiles([file]);
            let fileTokens = (file.tokenCount || encode(contents).length) * 1.4;
            console.log("processing file >>", file.path, "tokens", fileTokens);

            // keep adding to token length
            if (chunkTokens + fileTokens < tokenLimit - 500) {
                chunkTokens += fileTokens;
                chunk.push(file);
            } else {
                chunks.push(...chunk);
                chunk = [file];
                chunkTokens = fileTokens;
            }
        }

        if (chunk.length) {
            chunks.push(...chunk);
        }

        return chunks;
    }
}
