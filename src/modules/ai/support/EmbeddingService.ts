import { EMBEDDINGS_DIMENSIONS, EMBEDDINGS_MODEL } from "@/constants";
import { encode } from "gpt-tokenizer";
import OpenAI from "openai";

export class EmbeddingService {
    private openai: OpenAI;

    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY,
            dangerouslyAllowBrowser: true,
        });
    }

    async generateEmbeddingsForFilesInChunks(files: FileDetails[]) {
        const filesToUpdate = files.filter(
            (file) => !file.embeddings || file.embeddings.length === 0
        );

        if (filesToUpdate.length === 0) {
            console.log("No files to update embeddings");
            return files;
        }

        const maxTokens = 8192; // Maximum tokens allowed by the model
        const reservedTokens = 500; // Reserve space for overhead
        const inputTexts = filesToUpdate.map((file) => `${file.path}\n${file.content}`);

        const chunks: { chunk: string[]; filesInChunk: FileDetails[] }[] = [];
        let currentChunk: string[] = [];
        let currentFiles: FileDetails[] = [];
        let currentTokens = 0;

        for (let i = 0; i < inputTexts.length; i++) {
            const text = inputTexts[i];
            const tokens = encode(text).length;

            // Check if adding this text exceeds the max tokens allowed
            if (currentTokens + tokens + reservedTokens > maxTokens) {
                console.log(
                    `Chunking due to token limit ${currentTokens + tokens} ${
                        maxTokens - reservedTokens
                    }`
                );
                chunks.push({ chunk: currentChunk, filesInChunk: currentFiles });
                currentChunk = [];
                currentFiles = [];
                currentTokens = 0;
            }

            currentChunk.push(text);
            currentFiles.push(filesToUpdate[i]);
            currentTokens += tokens;
        }

        // Add the last chunk if any
        if (currentChunk.length > 0) {
            console.log(`Adding last chunk of ${currentChunk.length} files`);
            chunks.push({ chunk: currentChunk, filesInChunk: currentFiles });
        }

        console.log(
            `Generating embeddings for ${filesToUpdate.length} files in ${chunks.length} chunks`
        );

        const embeddings: any[] = [];
        for (const { chunk, filesInChunk } of chunks) {
            const chunkTokens = encode(chunk.join("\n")).length; // Calculate the token size of the chunk
            console.log(
                `Generating embeddings for chunk of ${chunk.length} files  chunk size: ${chunk.length}, tokens: ${chunkTokens}`
            );

            const response = await this.openai.embeddings.create({
                model: EMBEDDINGS_MODEL,
                dimensions: EMBEDDINGS_DIMENSIONS,
                input: chunk,
            });

            const chunkEmbeddings = response?.data?.map((item) => item.embedding) || [];
            embeddings.push(...chunkEmbeddings);
        }

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

    async generateEmbeddingsForFiles(files: FileDetails[]) {
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
