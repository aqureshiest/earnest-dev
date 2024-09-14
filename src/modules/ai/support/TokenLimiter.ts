import { encode, decode } from "gpt-tokenizer";
import { LLMS } from "../../utils/llmInfo";
import { formatFiles } from "@/modules/utils/formatFiles";

export class TokenLimiter {
    BUFFER = 500;
    PADDING = 1.4;

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

    applyTokenLimitToPrompt(model: string, prompt: string) {
        // get LLM info
        const LLM: any = LLMS.find((m) => m.model === model);

        // TODO: might have to apply the 70/30 IO ratio here
        const allowedTokens = LLM.maxInputTokens - this.BUFFER;

        // encode the prompt and slice it to the allowed tokens
        const encodedPrompt = encode(prompt);
        const totalTokens = encodedPrompt.length * this.PADDING;
        const updatedPrompt =
            totalTokens > allowedTokens ? decode(encodedPrompt.slice(0, allowedTokens)) : prompt;

        return {
            totalTokens,
            prompt: updatedPrompt,
        };
    }

    applyTokenLimit(model: string, prompt: string, files: FileDetails[]) {
        // get LLM info
        const LLM: any = LLMS.find((m) => m.model === model);

        // TODO: might have to apply the 70/30 IO ratio here
        const allowedTokens = LLM.maxInputTokens - this.BUFFER;

        // start with token length of the prompt
        let totalTokens = encode(prompt).length * this.PADDING;

        const allowedFiles = [];
        let index = 0;
        // add files to the prompt
        for (const file of files) {
            const contents = formatFiles([file]);
            let fileTokens = (file.tokenCount || encode(contents).length) * this.PADDING; // TODO: IO ratio
            // console.log(`File: ${file.path}, Tokens: ${fileTokens}`);

            // keep adding to token length
            if (totalTokens + fileTokens < allowedTokens) {
                totalTokens += fileTokens;
                allowedFiles.push(file);
            } else {
                console.log(`Skipping files past ${index} index in files list due to token limit`);
                console.log(`Total tokens: ${totalTokens}, Allowed tokens: ${allowedTokens}`);
                break;
            }

            index++;
        }

        return {
            totalTokens,
            allowedFiles,
        };
    }

    splitInChunks(model: string, prompt: string, files: FileDetails[]) {
        const chunks: { files: FileDetails[]; tokens: number }[] = [];
        let chunk: FileDetails[] = [];
        let chunkTokens = 0;

        // get LLM info
        const LLM: any = LLMS.find((m) => m.model === model);

        // remove prompt tokens space
        let promptTokens = encode(prompt).length * this.PADDING;

        // TODO: might have to apply the 70/30 IO ratio here
        const allowedTokens = LLM.maxInputTokens - this.BUFFER - promptTokens;

        for (const file of files) {
            const contents = formatFiles([file]);
            let fileTokens = (file.tokenCount || encode(contents).length) * this.PADDING; //TODO: IO ratio

            // keep adding to token length
            if (chunkTokens + fileTokens < allowedTokens) {
                chunkTokens += fileTokens;
                chunk.push(file);
            } else {
                chunks.push({
                    files: chunk,
                    tokens: chunkTokens,
                });
                chunk = [file];
                chunkTokens = fileTokens;
            }
        }

        if (chunk.length) {
            chunks.push({
                files: chunk,
                tokens: chunkTokens,
            });
        }

        return chunks;
    }
}
