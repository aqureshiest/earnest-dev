import { encode, decode } from "gpt-tokenizer";
import { LLMS } from "../../utils/llmInfo";

export class TokenLimiter {
    BUFFER = 1000;

    getTokenCount(text: string, model: string): number {
        if (!text || text.length === 0) return 0;

        const LLM = LLMS.find((m) => m.model === model);
        if (!LLM) {
            throw new Error(`LLM ${model} not found`);
        }

        // Basic tokenization with gpt-tokenizer
        const baseTokenCount = encode(text).length;

        return Math.ceil(baseTokenCount * (LLM.tokenPaddingFactor || 1));
    }

    calculateTokenLimit(model: string, allocatedPercentage: number = 100): number {
        const LLM = LLMS.find((m) => m.model === model);
        if (!LLM) {
            throw new Error(`LLM ${model} not found`);
        }

        // Calculate tokens based on percentage of max input tokens
        const percentage = Math.max(0, Math.min(100, allocatedPercentage)) / 100;
        const allocatedTokens = Math.floor(LLM.maxInputTokens * percentage);

        // Still apply buffer to the allocated tokens
        return Math.max(0, allocatedTokens - this.BUFFER);
    }

    tokenizeFiles(files: FileDetails[], model: string): FileDetails[] {
        return files
            .map((file) => {
                // no need to tokenize if token count is already there
                if (file.tokenCount) {
                    return file;
                }

                const tokens = this.getTokenCount(`${file.path}\n${file.content}`, model);
                return {
                    ...file,
                    tokenCount: tokens,
                };
            })
            .filter((file) => file.tokenCount > 0);
    }

    applyTokenLimitToPrompt(
        systemPrompt: string,
        userPrompt: string,
        model: string,
        allocatedPercentage: number = 100
    ) {
        // Calculate allowed tokens based on allocation percentage
        const allowedTokens = this.calculateTokenLimit(model, allocatedPercentage);

        const systemPromptTokens = this.getTokenCount(systemPrompt, model);
        const userPromptTokens = this.getTokenCount(userPrompt, model);
        const totalTokens = systemPromptTokens + userPromptTokens;

        // If under limit, return unchanged
        if (totalTokens <= allowedTokens) {
            return {
                totalTokens,
                prompt: userPrompt,
                truncated: false,
            };
        }

        console.log(
            `Truncating prompt due to token limit and allocation (${allocatedPercentage}%)`
        );
        console.log(`Total tokens: ${totalTokens}, Allocated tokens: ${allowedTokens}`);

        // Simple truncation approach that maintains compatibility
        const encodedPrompt = encode(userPrompt);
        const updatedPrompt =
            totalTokens > allowedTokens
                ? decode(encodedPrompt.slice(0, allowedTokens - systemPromptTokens))
                : userPrompt;

        return {
            totalTokens,
            prompt: updatedPrompt,
            truncated: true,
        };
    }

    applyTokenLimit(
        prompt: string,
        files: FileDetails[],
        model: string,
        allocatedPercentage: number = 100
    ) {
        // Calculate allowed tokens based on allocation percentage
        const allowedTokens = this.calculateTokenLimit(model, allocatedPercentage);
        const promptTokens = this.getTokenCount(prompt, model);

        // Log allocation info
        console.log(`Token allocation: ${allocatedPercentage}% of maximum context`);
        console.log(`Allocated tokens: ${allowedTokens} (after buffer)`);
        console.log(`Prompt tokens: ${promptTokens}`);
        console.log(`Available for files: ${allowedTokens - promptTokens} tokens`);

        // Tokenize files with model-specific estimation
        const tokenizedFiles = this.tokenizeFiles(files, model);

        const allowedFiles = [];
        let totalTokens = promptTokens;
        let index = 0;

        // Add files until we hit the limit
        for (const file of tokenizedFiles) {
            const fileTokens = file.tokenCount || 0;

            // Keep adding to token length
            if (totalTokens + fileTokens < allowedTokens) {
                totalTokens += fileTokens;
                allowedFiles.push(file);
            } else {
                console.log(`Skipping files past ${index} index in files list due to token limit`);
                break;
            }
            index++;
        }

        console.log(`Using tokens: ${totalTokens}, Allowed tokens: ${allowedTokens}`);
        return {
            totalTokens,
            allowedFiles,
        };
    }

    splitInChunks(
        prompt: string,
        files: FileDetails[],
        model: string,
        allocatedPercentage: number = 100,
        maxTokensPerChunk?: number
    ) {
        // Calculate allowed tokens based on allocation percentage
        const allowedTokens = this.calculateTokenLimit(model, allocatedPercentage);
        const promptTokens = this.getTokenCount(prompt, model);
        const availableTokens = allowedTokens - promptTokens;

        // Tokenize files with better estimation
        const tokenizedFiles = this.tokenizeFiles(files, model);

        // For balanced chunking
        const totalTokens = tokenizedFiles.reduce((sum, file) => sum + (file.tokenCount || 0), 0);
        let tokensPerChunk: number;

        if (maxTokensPerChunk) {
            // Use the override value, but ensure it doesn't exceed available tokens
            tokensPerChunk = Math.min(maxTokensPerChunk, availableTokens);
        } else {
            // Use optimal chunking strategy
            const optimalChunkCount = Math.ceil(totalTokens / availableTokens);
            tokensPerChunk = Math.ceil(totalTokens / optimalChunkCount);
        }

        const chunks: { files: FileDetails[]; tokens: number }[] = [];
        let chunk: FileDetails[] = [];
        let chunkTokens = 0;

        for (const file of tokenizedFiles) {
            const fileTokens = file.tokenCount || 0;

            if (chunkTokens + fileTokens > tokensPerChunk && chunk.length > 0) {
                // Use the same heuristic as the original code for compatibility
                const diffIfAdded = Math.abs(chunkTokens + fileTokens - tokensPerChunk);
                const diffIfNotAdded = Math.abs(chunkTokens - tokensPerChunk);

                if (diffIfAdded <= diffIfNotAdded && chunkTokens + fileTokens <= availableTokens) {
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

        // Output stats (same as original for consistency plus allocation info)
        console.log("------------- Token Limiter Stats -------------");
        console.log(`Allocation: ${allocatedPercentage}% of max context`);
        console.log(`Total file tokens: ${totalTokens}`);
        console.log(`Tokens per chunk: ${tokensPerChunk}`);
        console.log(`Total chunks: ${chunks.length}`);
        console.log(`Total files: ${files.length}`);
        console.log(`Allowed tokens: ${allowedTokens}`);
        console.log(`Prompt tokens: ${promptTokens}`);
        console.log(`Buffer: ${this.BUFFER}`);
        console.log("------------- Token Limiter Stats -------------");

        return chunks;
    }
}
