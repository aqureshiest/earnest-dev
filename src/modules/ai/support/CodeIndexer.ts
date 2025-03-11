import { encode } from "gpt-tokenizer";
import {
    MarkdownTextSplitter,
    RecursiveCharacterTextSplitter,
    TokenTextSplitter,
} from "@langchain/textsplitters";
import { OpenAIEmbeddings } from "@langchain/openai";
import { EMBEDDINGS_DIMENSIONS, EMBEDDINGS_MODEL, TITAN_EMBEDDINGS_MODEL } from "@/constants";
import { RepositoryDataService } from "@/modules/db/RepositoryDataService";
import { sendTaskUpdate } from "@/modules/utils/sendTaskUpdate";
import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { CustomBedrockEmbeddings } from "./CustomBedrockEmbeddings";
import { reportError } from "@/modules/bugsnag/report";

export interface FileChunk {
    fileId: number;
    chunkIndex: number;
    path: string;
    content: string;
    owner: string;
    repo: string;
    ref: string;
    tokenCount: number;
    embeddings?: number[];
    similarity?: number;
}

interface EmbeddingsInterface {
    embedDocuments(texts: string[]): Promise<number[][]>;
    embedQuery(text: string): Promise<number[]>;
}

export class CodeIndexer {
    private embeddings: EmbeddingsInterface;
    private dataService: RepositoryDataService;

    constructor() {
        this.dataService = new RepositoryDataService();

        const EMBEDDING_PROVIDER = process.env.EMBEDDING_PROVIDER || "openai"; // Default to OpenAI
        const AWS_REGION = process.env.AWS_REGION || "us-east-1";

        // Initialize embeddings based on environment variable
        if (EMBEDDING_PROVIDER === "titan") {
            const bedrockClient = new BedrockRuntimeClient({
                region: AWS_REGION,
            });

            this.embeddings = new CustomBedrockEmbeddings({
                model: TITAN_EMBEDDINGS_MODEL,
                client: bedrockClient,
                dimensions: EMBEDDINGS_DIMENSIONS,
                normalize: true,
            });
            console.log("Using Titan embeddings");
        } else {
            this.embeddings = new OpenAIEmbeddings({
                model: EMBEDDINGS_MODEL,
                dimensions: EMBEDDINGS_DIMENSIONS,
            });
            console.log("Using OpenAI embeddings");
        }
    }

    async processFilesIntoChunks(
        files: FileDetails[],
        owner: string,
        repo: string,
        ref: string,
        taskId?: string
    ): Promise<void> {
        // Process files in batches to avoid overloading
        const BATCH_SIZE = 10;
        const totalFiles = files.length;

        try {
            for (let i = 0; i < files.length; i += BATCH_SIZE) {
                const fileBatch = files.slice(i, i + BATCH_SIZE);

                try {
                    await this.processFileBatch(fileBatch, owner, repo, ref);
                } catch (error) {
                    // Report batch processing error but continue with next batch
                    reportError(error as Error, {
                        codeIndexer: {
                            operation: "processFileBatch",
                            batchIndex: i / BATCH_SIZE,
                            owner,
                            repo,
                            ref,
                            filesInBatch: fileBatch.map((f) => f.path),
                        },
                    });
                    console.error(`Error processing batch ${i / BATCH_SIZE}:`, error);
                }

                // Calculate progress
                const filesProcessed = Math.min(i + BATCH_SIZE, totalFiles);
                const percentComplete = (filesProcessed / totalFiles) * 100;
                const progressMessage = `Processed ${filesProcessed} of ${totalFiles} files (${percentComplete.toFixed(
                    0
                )}%)`;
                console.log(progressMessage);

                if (taskId) {
                    sendTaskUpdate(taskId, "progress", progressMessage);
                }
            }

            // Final completion message
            const completionMessage = `Processing complete: ${totalFiles} files processed`;
            console.log(completionMessage);
            if (taskId) {
                sendTaskUpdate(taskId, "progress", completionMessage);
            }
        } catch (error) {
            reportError(error as Error, {
                codeIndexer: {
                    operation: "processFilesIntoChunks",
                    totalFiles,
                    owner,
                    repo,
                    ref,
                    taskId,
                },
            });
            throw error;
        }
    }

    private async processFileBatch(
        files: FileDetails[],
        owner: string,
        repo: string,
        ref: string
    ): Promise<void> {
        for (const file of files) {
            if (!file.content || file.content.trim().length === 0) continue;

            try {
                // First make sure the file is in FileDetails table
                const fileId = await this.dataService.saveFileDetails(file);

                // Delete existing chunks for this file
                await this.dataService.deleteFileChunks(owner, repo, ref, file.path);

                // Split the file into chunks
                const splitter = this.getSplitterForFile(file);
                const docs = await splitter.createDocuments([file.content]);

                // Generate embeddings for all chunks
                const contents = docs.map((c) => c.pageContent);
                const contentEmbeddings = await this.generateEmbeddings(contents);

                // Create chunk records
                const chunks: any[] = docs.map((chunk, index) => ({
                    fileId,
                    chunkIndex: index,
                    path: file.path,
                    content: chunk.pageContent,
                    owner: owner,
                    repo: repo,
                    ref: ref,
                    tokenCount: encode(chunk.pageContent).length,
                    embeddings: contentEmbeddings[index],
                }));

                // Insert chunks in batches to avoid query size limits
                const CHUNK_BATCH_SIZE = 20;
                for (let i = 0; i < chunks.length; i += CHUNK_BATCH_SIZE) {
                    const chunkBatch = chunks.slice(i, i + CHUNK_BATCH_SIZE);
                    await this.dataService.saveFileChunks(chunkBatch);
                }
            } catch (error) {
                console.error(`Error processing file ${file.path} into chunks:`, error);

                reportError(error as Error, {
                    codeIndexer: {
                        operation: "processFileBatch",
                        filePath: file.path,
                        owner,
                        repo,
                        ref,
                        fileSize: file.content?.length || 0,
                    },
                });

                throw error;
            }
        }
    }

    private getSplitterForFile(
        file: FileDetails
    ): RecursiveCharacterTextSplitter | MarkdownTextSplitter | TokenTextSplitter {
        const extension = file.path.split(".").pop()?.toLowerCase() || "";
        const chunkSize = 500;
        const chunkOverlap = 100;

        switch (extension) {
            case "md":
            case "markdown":
                return new MarkdownTextSplitter({ chunkSize, chunkOverlap });

            case "ts":
            case "tsx":
            case "js":
            case "jsx":
            case "json":
                return RecursiveCharacterTextSplitter.fromLanguage("js", {
                    chunkSize,
                    chunkOverlap,
                });

            case "py":
                return RecursiveCharacterTextSplitter.fromLanguage("python", {
                    chunkSize,
                    chunkOverlap,
                });

            case "java":
                return RecursiveCharacterTextSplitter.fromLanguage("java", {
                    chunkSize,
                    chunkOverlap,
                });

            case "html":
            case "xml":
                return RecursiveCharacterTextSplitter.fromLanguage("html", {
                    chunkSize,
                    chunkOverlap,
                });

            default:
                // Default to a recursive character splitter for unknown file types
                return new RecursiveCharacterTextSplitter({ chunkSize, chunkOverlap });
        }
    }

    async generateEmbeddings(texts: string[]): Promise<number[][]> {
        try {
            return await this.embeddings.embedDocuments(texts);
        } catch (error) {
            reportError(error as Error, {
                codeIndexer: {
                    operation: "generateEmbeddings",
                    textsCount: texts.length,
                    textsSample: texts.map((t) => t.substring(0, 100) + "...").join("\n"),
                },
            });
            throw error;
        }
    }

    async generateEmbedding(text: string): Promise<number[]> {
        try {
            return await this.embeddings.embedQuery(text);
        } catch (error) {
            reportError(error as Error, {
                codeIndexer: {
                    operation: "generateEmbedding",
                    textLength: text.length,
                    textSample: text.substring(0, 200) + "...",
                },
            });
            throw error;
        }
    }
}
