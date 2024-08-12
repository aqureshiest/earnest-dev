// File: modules/vector/VectorStore.ts
import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAIService } from "../ai/clients/OpenAIService";

export class VectorStore {
    private index;
    private openaiService: OpenAIService;

    constructor() {
        const pc = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY!,
        });
        this.index = pc.index(process.env.PINECONE_INDEX_NAME!);
        this.openaiService = new OpenAIService();
    }

    private generateKey(file: FileDetails): string {
        return `${file.owner}/${file.repo}/${file.path}`;
    }

    async addFiles(files: FileDetails[]): Promise<void> {
        const vectors = files.map((file) => ({
            id: this.generateKey(file),
            values: file.embeddings,
            metadata: {
                name: file.name,
                path: file.path,
                content: file.content,
                owner: file.owner,
                repo: file.repo,
                ref: file.ref,
                commitHash: file.commitHash,
                tokenCount: file.tokenCount,
            },
        }));

        await this.index.namespace("ns1").upsert(vectors);
    }

    async getFileDetails(owner: string, repo: string, path: string): Promise<FileDetails | null> {
        const key = `${owner}/${repo}/${path}`;
        const response = await this.index
            .namespace("ns1")
            .query({ id: key, topK: 1, includeValues: true, includeMetadata: true });

        if (response.matches.length === 0) {
            return null;
        }

        const vector: any = response.matches[0];
        return {
            name: vector.metadata.name,
            path: vector.metadata.path,
            content: vector.metadata.content,
            owner: vector.metadata.owner,
            repo: vector.metadata.repo,
            ref: vector.metadata.ref,
            commitHash: vector.metadata.comitHash,
            embeddings: vector.values,
            tokenCount: vector.metadata.tokenCount,
        };
    }

    async findSimilar(text: string, topK: number = 5): Promise<FileDetails[]> {
        const queryEmbeddings = await this.openaiService.generateEmbeddings(text);

        const response: any = await this.index.namespace("ns1").query({
            vector: queryEmbeddings,
            topK,
            includeValues: true,
            includeMetadata: true,
        });
        console.log(response);

        return response.matches.map((match: any) => ({
            name: match.metadata.name,
            path: match.metadata.path,
            content: match.metadata.content,
            owner: match.metadata.owner,
            repo: match.metadata.repo,
            ref: match.metadata.ref,
            comitHash: match.metadata.comitHash,
            embeddings: match.values,
        }));
    }
}
