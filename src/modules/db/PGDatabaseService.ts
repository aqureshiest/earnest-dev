import { Pool } from "pg";
import { EmbeddingService } from "../ai/support/EmbeddingService";

export class PGDatabaseService {
    private pool: Pool;
    private embeddingService: EmbeddingService;

    constructor() {
        this.pool = new Pool({
            connectionString: process.env.POSTGRES_URL!,
            ssl: {
                rejectUnauthorized: false,
            },
        });
        this.embeddingService = new EmbeddingService();
    }

    private formatVector(vector: number[]): string {
        return `{${vector.map((v) => v.toString()).join(", ")}}`;
    }

    async saveFileDetails(file: FileDetails): Promise<void> {
        const client = await this.pool.connect();
        try {
            const query = `
                INSERT INTO filedetails (name, path, content, owner, repo, ref, commithash, embeddings)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8::vector)
                ON CONFLICT (owner, repo, ref, path)
                DO UPDATE SET
                    name = EXCLUDED.name,
                    content = EXCLUDED.content,
                    commithash = EXCLUDED.commithash,
                    embeddings = EXCLUDED.embeddings
            `;

            const values = [
                file.name,
                file.path,
                file.content,
                file.owner,
                file.repo,
                file.ref,
                file.commitHash,
                file.embeddings,
            ];
            await client.query(query, values);
        } catch (error: any) {
            throw new Error(`Error saving file details: ${error}`);
        } finally {
            client.release();
        }
    }

    async getFileDetails(
        owner: string,
        repo: string,
        ref: string = "main",
        path: string
    ): Promise<FileDetails | null> {
        const client = await this.pool.connect();
        try {
            const query = `
                SELECT * FROM filedetails
                WHERE owner = $1 AND repo = $2 AND ref = $3 AND path = $4
                LIMIT 1
            `;
            const values = [owner, repo, ref, path];
            const result = await client.query(query, values);
            if (result.rows.length === 0) {
                return null;
            }
            return result.rows[0] as FileDetails;
        } catch (error: any) {
            console.error(`Error fetching file ${repo}:${ref}:${path} details: ${error.message}`);
            return null;
        } finally {
            client.release();
        }
    }

    async getAllFileDetails(
        owner: string,
        repo: string,
        ref: string = "main"
    ): Promise<FileDetails[]> {
        const client = await this.pool.connect();
        try {
            const query = `
                SELECT * FROM filedetails
                WHERE owner = $1 AND repo = $2 AND ref = $3
            `;
            const values = [owner, repo, ref];
            const result = await client.query(query, values);
            return result.rows as FileDetails[];
        } catch (error: any) {
            throw new Error(`Error fetching all file details: ${error.message}`);
        } finally {
            client.release();
        }
    }

    // async findSimilar(
    //     text: string,
    //     topK: number = 5,
    //     owner: string,
    //     repo: string,
    //     ref: string
    // ): Promise<FileDetails[]> {
    //     const embeddings = await this.embeddingService.generateEmbeddings(text);

    //     const { data, error } = await this.supabase.rpc("find_similar_files", {
    //         query_embeddings: embeddings,
    //         top_k: topK,
    //         given_owner: owner,
    //         given_repo: repo,
    //         given_ref: ref,
    //     });

    //     if (error) {
    //         throw new Error(`Error finding similar files: ${error.message}`);
    //     }

    //     return data as FileDetails[];
    // }
}
