import { Pinecone } from "@pinecone-database/pinecone";
import { EmbeddingService } from "../ai/support/EmbeddingService";

interface VectorMetadata {
    [key: string]: any;
}

interface SearchParams {
    query: string;
    namespace?: string;
    limit?: number;
    filter?: Record<string, any>;
}

interface SearchResult<T extends VectorMetadata> {
    id: string;
    score: number;
    metadata: T;
}

export class VectorStore {
    private pinecone: Pinecone;
    private embeddingService: EmbeddingService;
    private indexName: string;
    private namespace: string;

    constructor(indexName: string, namespace: string) {
        this.indexName = indexName;
        this.namespace = namespace;

        this.embeddingService = new EmbeddingService();

        // Initialize Pinecone
        this.pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY!,
        });
    }

    /**
     * Upserts vectors to the store
     */
    public async upsert<T extends VectorMetadata>(
        vectors: Array<{
            id: string;
            values: number[];
            metadata: T;
        }>
    ): Promise<void> {
        const index = this.pinecone.Index(this.indexName);

        await index.namespace(this.namespace).upsert(vectors);
    }

    /**
     * Performs a semantic search
     */
    public async search<T extends VectorMetadata>(
        params: SearchParams
    ): Promise<SearchResult<T>[]> {
        const { query, namespace, limit = 10, filter } = params;
        const queryEmbedding = await this.embeddingService.generateEmbeddings(query);
        const index = this.pinecone.Index(this.indexName);

        const searchRequest = {
            vector: queryEmbedding,
            topK: limit,
            includeMetadata: true,
            namespace,
            filter,
        };

        const searchResponse = await index.namespace(this.namespace).query(searchRequest);

        return (
            searchResponse.matches?.map((match) => ({
                id: match.id,
                score: match.score || 0,
                metadata: match.metadata as T,
            })) || []
        );
    }

    /**
     * Deletes vectors by namespace or filter
     */
    public async delete(params: {
        namespace?: string;
        filter?: Record<string, any>;
        ids?: string[];
        deleteAll?: boolean;
    }): Promise<void> {
        const index = this.pinecone.Index(this.indexName);

        await index.namespace(this.namespace).deleteMany(params);
    }

    /**
     * Batches an array of items for vector storage
     */
    public async processBatch<T extends VectorMetadata>(
        items: Array<{
            id: string;
            text: string;
            metadata: T;
        }>,
        batchSize: number = 100,
        namespace?: string
    ): Promise<void> {
        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            const vectors = await Promise.all(
                batch.map(async (item) => ({
                    id: item.id,
                    values: await this.embeddingService.generateEmbeddings(item.text),
                    metadata: item.metadata,
                }))
            );

            await this.upsert(vectors);
        }
    }
}
