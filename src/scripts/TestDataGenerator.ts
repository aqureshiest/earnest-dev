import crypto from "crypto";

interface MockFile {
    name: string;
    content: string;
    tokenCount: number;
}

class TestDataGenerator {
    private static readonly AVG_TOKENS_PER_CHAR = 0.3;

    generateMockCodebase(fileCount: number, minTokens: number, maxTokens: number): MockFile[] {
        return Array.from({ length: fileCount }, (_, i) =>
            this.generateMockFile(i, minTokens, maxTokens)
        );
    }

    private generateMockFile(index: number, minTokens: number, maxTokens: number): MockFile {
        const tokenCount = Math.floor(Math.random() * (maxTokens - minTokens + 1)) + minTokens;
        const charCount = Math.ceil(tokenCount / TestDataGenerator.AVG_TOKENS_PER_CHAR);

        return {
            name: `file_${index}.ts`,
            content: crypto.randomBytes(charCount).toString("hex"),
            tokenCount: tokenCount,
        };
    }
}

export { TestDataGenerator };
