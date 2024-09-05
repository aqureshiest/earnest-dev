import { EMBEDDINGS_DIMENSIONS, EMBEDDINGS_MAX_TOKENS, EMBEDDINGS_MODEL } from "@/constants";
import { encode } from "gpt-tokenizer";
import OpenAI from "openai";

export class EmbeddingService {
    private openai: OpenAI;

    constructor() {
        this.openai = new OpenAI();
    }

    async generateEmbeddingsForFilesInChunks(files: FileDetails[]) {
        const chunks: FileDetails[][] = [];
        let chunk: FileDetails[] = [];
        let chunkSize = 0;

        console.log("Embeddings request for", files.length, "files");
        const buffer = 191; // 8191 - 191
        const allowedTokens = EMBEDDINGS_MAX_TOKENS - buffer;

        for (const file of files) {
            const tokens = encode(`${file.path}\n${file.content}`).length;

            if (tokens >= allowedTokens) {
                console.warn(
                    `File ${file.path} has ${tokens} tokens. Too large to process. Skipping`
                );
            } else {
                if (chunkSize + tokens < allowedTokens) {
                    chunk.push(file);
                    chunkSize += tokens;
                } else {
                    chunks.push(chunk);
                    chunk = [file];
                    chunkSize = tokens;
                }
            }
        }
        if (chunk.length > 0) {
            chunks.push(chunk);
        }

        const updatedFiles: FileDetails[] = [];

        console.log("Processing", chunks.length, "chunks");
        // Process chunks in parallel with a concurrency limit
        const concurrencyLimit = 5;
        const chunkPromises = chunks.map((chunk) => async () => {
            try {
                const updatedChunk = await this.generateEmbeddingsForFiles(chunk);
                updatedFiles.push(...updatedChunk);
            } catch (error) {
                console.error("Error generating embeddings:", error);
            }
        });

        await this.processInParallel(chunkPromises, concurrencyLimit);
        return updatedFiles;
    }

    private async processInParallel(tasks: (() => Promise<void>)[], concurrencyLimit: number) {
        const runningTasks = new Set<Promise<void>>();

        for (const task of tasks) {
            const runningTask = task();
            runningTasks.add(runningTask);

            runningTask.finally(() => runningTasks.delete(runningTask));

            if (runningTasks.size >= concurrencyLimit) {
                await Promise.race(runningTasks);
            }
        }

        await Promise.all(runningTasks);
    }

    async generateEmbeddingsForFiles(files: FileDetails[]): Promise<FileDetails[]> {
        const filesToUpdate = files.filter(
            (file) => !file.embeddings || file.embeddings.length === 0
        );

        if (filesToUpdate.length === 0) {
            console.log("No files to update embeddings");
            return files;
        }

        const inputTexts = filesToUpdate.map((file) => `${file.path}\n${file.content}`);

        console.log("Generating embeddings for", filesToUpdate.length, "files");
        const response = await this.openai.embeddings.create({
            model: EMBEDDINGS_MODEL,
            dimensions: EMBEDDINGS_DIMENSIONS,
            input: inputTexts,
        });

        console.log("embeddings usage", response.usage);

        const embeddings = response?.data?.map((item) => item.embedding) || [];

        // Create a map of updated files to their embeddings
        const updatedFilesMap = new Map();
        filesToUpdate.forEach((file, index) => {
            const key = `${file.owner}/${file.repo}/${file.ref}/${file.path}`;
            updatedFilesMap.set(key, embeddings[index]);
        });

        // Update files array with new embeddings
        return files.map((file) => {
            const key = `${file.owner}/${file.repo}/${file.ref}/${file.path}`;
            return {
                ...file,
                embeddings:
                    file.embeddings && file.embeddings.length > 0
                        ? file.embeddings
                        : updatedFilesMap.get(key),
            };
        });
    }

    async generateEmbeddings(text: string) {
        const response: any = await this.openai.embeddings.create({
            model: EMBEDDINGS_MODEL,
            dimensions: EMBEDDINGS_DIMENSIONS,
            input: text,
        });

        return response?.data[0].embedding || [];
    }
}
