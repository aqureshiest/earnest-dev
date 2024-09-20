import { encode, decode } from "gpt-tokenizer";
import { LLMS } from "../../utils/llmInfo";
import { formatFiles } from "@/modules/utils/formatFiles";

// TODO might have to do something about 70/30 IO ratio
// for now padding is helping

// dynamic buffer
// const bufferPercentage = 0.05; // 5% buffer
// const allowedTokens = Math.floor(llmInfo.maxInputTokens * (1 - bufferPercentage));

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

    applyTokenLimitToPrompt(model: string, systemPrompt: string, userPrompt: string) {
        // get LLM info
        const LLM: any = LLMS.find((m) => m.model === model);

        const allowedTokens = LLM.maxInputTokens - this.BUFFER;

        const systemPromptTokens = this.getTokenCount(systemPrompt);
        const userPromptTokens = this.getTokenCount(userPrompt);
        const totalTokens = systemPromptTokens + userPromptTokens;

        // encode the prompt and slice it to the allowed tokens
        const encodedPrompt = encode(userPrompt);
        const updatedPrompt =
            totalTokens > allowedTokens
                ? decode(encodedPrompt.slice(0, allowedTokens - systemPromptTokens))
                : userPrompt;

        return {
            totalTokens,
            prompt: updatedPrompt,
        };
    }

    applyTokenLimit(model: string, prompt: string, files: FileDetails[]) {
        // get LLM info
        const LLM: any = LLMS.find((m) => m.model === model);

        const allowedTokens = LLM.maxInputTokens - this.BUFFER;
        let totalTokens = this.getTokenCount(prompt);

        const allowedFiles = [];
        let index = 0;
        // add files to the prompt
        for (const file of files) {
            const fileTokens = this.getFileTokens(file);

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
        // get LLM info
        const LLM: any = LLMS.find((m) => m.model === model);

        const promptTokens = this.getTokenCount(prompt);
        const allowedTokens = LLM.maxInputTokens - this.BUFFER - promptTokens;

        // for balanced chunking
        const totalTokens = files.reduce((sum, file) => sum + this.getFileTokens(file), 0);
        const optimalChunkCount = Math.ceil(totalTokens / allowedTokens);
        const tokensPerChunk = Math.ceil(totalTokens / optimalChunkCount);

        const chunks: { files: FileDetails[]; tokens: number }[] = [];
        let chunk: FileDetails[] = [];
        let chunkTokens = 0;

        for (const file of files) {
            const fileTokens = this.getFileTokens(file);

            if (chunkTokens + fileTokens > tokensPerChunk && chunk.length > 0) {
                const diffIfAdded = Math.abs(chunkTokens + fileTokens - tokensPerChunk);
                const diffIfNotAdded = Math.abs(chunkTokens - tokensPerChunk);

                if (diffIfAdded <= diffIfNotAdded && chunkTokens + fileTokens <= allowedTokens) {
                    // add to current chunk
                    chunk.push(file);
                    chunkTokens += fileTokens;
                } else {
                    // start new chunk
                    chunks.push({ files: chunk, tokens: chunkTokens });
                    chunk = [file];
                    chunkTokens = fileTokens;
                }
            } else {
                // add to current chunk
                chunk.push(file);
                chunkTokens += fileTokens;
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

    private getFileTokens(file: FileDetails): number {
        if (file.tokenCount !== undefined) return file.tokenCount * this.PADDING;
        const contents = formatFiles([file]);
        return this.getTokenCount(contents) * this.PADDING;
    }

    private getTokenCount(text: string): number {
        return encode(text).length * this.PADDING;
    }
}
