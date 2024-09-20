import fs from "fs";
import { loadEnvConfig } from "@next/env";
import { PrepareCodebase } from "@/modules/ai/PrepareCodebase";
import { LLM_MODELS, LLMS } from "@/modules/utils/llmInfo";
import { TokenLimiter } from "@/modules/ai/support/TokenLimiter";
import { TestDataGenerator } from "./TestDataGenerator";

loadEnvConfig("");

class ChunkingVerifier {
    verifyChunks(
        originalFiles: FileDetails[],
        chunks: { files: FileDetails[]; tokens: number }[],
        maxTokens: number
    ) {
        this.verifyAllFilesIncluded(originalFiles, chunks);
        this.verifyNoOverlap(chunks);
        this.verifyTokenLimits(chunks, maxTokens);
        this.analyzeDistribution(chunks);
        this.visualizeChunks(chunks);
    }

    private verifyAllFilesIncluded(
        originalFiles: FileDetails[],
        chunks: { files: FileDetails[]; tokens: number }[]
    ) {
        const allChunkedFiles = chunks.flatMap((chunk) => chunk.files);
        const missingFiles = originalFiles.filter((file) => !allChunkedFiles.includes(file));
        if (missingFiles.length > 0) {
            console.error(`Error: ${missingFiles.length} files are missing from chunks.`);
        } else {
            console.log("All files are included in chunks.");
        }
    }

    private verifyNoOverlap(chunks: { files: FileDetails[]; tokens: number }[]) {
        const seenFiles = new Set<FileDetails>();
        let hasOverlap = false;
        chunks.forEach((chunk) => {
            chunk.files.forEach((file) => {
                if (seenFiles.has(file)) {
                    console.error(`Error: File ${file.name} appears in multiple chunks.`);
                    hasOverlap = true;
                }
                seenFiles.add(file);
            });
        });
        if (!hasOverlap) {
            console.log("No overlap detected between chunks.");
        }
    }

    private verifyTokenLimits(
        chunks: { files: FileDetails[]; tokens: number }[],
        maxTokens: number
    ) {
        const oversizedChunks = chunks.filter((chunk) => chunk.tokens > maxTokens);
        if (oversizedChunks.length > 0) {
            console.error(
                `Error: ${oversizedChunks.length} chunks exceed the maximum token limit.`
            );
        } else {
            console.log("All chunks are within the token limit.");
        }
    }

    private analyzeDistribution(chunks: { files: FileDetails[]; tokens: number }[]) {
        const tokenCounts = chunks.map((chunk) => chunk.tokens);
        const mean = tokenCounts.reduce((sum, count) => sum + count, 0) / chunks.length;
        const variance =
            tokenCounts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / chunks.length;
        const stdDev = Math.sqrt(variance);

        console.log(`Chunk Distribution Analysis:
            Number of Chunks: ${chunks.length}
            Mean Tokens per Chunk: ${mean.toFixed(2)}
            Standard Deviation: ${stdDev.toFixed(2)}
            Coefficient of Variation: ${((stdDev / mean) * 100).toFixed(2)}%`);
    }

    private visualizeChunks(chunks: { files: FileDetails[]; tokens: number }[]) {
        const maxTokens = Math.max(...chunks.map((chunk) => chunk.tokens));
        chunks.forEach((chunk, index) => {
            const barLength = Math.round((chunk.tokens / maxTokens) * 50);
            console.log(
                `Chunk ${index + 1}: ${"█".repeat(barLength)} (${chunk.tokens.toFixed(2)} tokens, ${
                    chunk.files.length
                } files)`
            );
        });
    }
}

export const chunks = async () => {
    // // with test data
    // const generator = new TestDataGenerator();
    // const mockCodebase = generator.generateMockCodebase(100, 500, 5000);
    // const totalTokens = mockCodebase.reduce((sum, file) => (sum += file.tokenCount), 0);
    // console.log(`Generated ${mockCodebase.length} mock files with ${totalTokens} tokens`);

    // // create files array from codebase
    // const files: FileDetails[] = mockCodebase.map((file) => ({
    //     name: file.name,
    //     path: file.name,
    //     content: file.content,
    //     owner: "test",
    //     repo: "test",
    //     ref: "test",
    //     commitHash: "",
    //     tokenCount: file.tokenCount,
    //     embeddings: [],
    // }));

    const codebase = new PrepareCodebase();
    const request: CodingTaskRequest = {
        taskId: Date.now().toString(),
        owner: "aqureshiest",
        repo: "laps-snapshot",
        branch: "main",
        task: "",
        model: LLM_MODELS.ANTHROPIC_CLAUDE_3_HAIKU,
        files: [],
        params: {},
    };

    const files = await codebase.prepare(request);

    const llm = LLMS.find((m) => m.model === request.model);
    const maxTokens = llm?.maxInputTokens || 0;

    // split into chunks
    const limiter = new TokenLimiter();
    const chunks = limiter.splitInChunks(request.model, "Process these files", files);

    const verifier = new ChunkingVerifier();
    console.log(`max tokens: ${maxTokens}`);
    verifier.verifyChunks(files, chunks, maxTokens);
};
