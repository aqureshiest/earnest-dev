import { Pool, PoolClient } from "pg";
import { EmbeddingService } from "../ai/support/EmbeddingService";

/**
 * SETUP SSH TUNNEL
 *
 * ssh -N -L 5432:aq-db.cluster-cevn3jqnzi9l.us-east-1.rds.amazonaws.com:5432 -i aq-new.pem ec2-user@ec2-34-228-26-82.compute-1.amazonaws.com
 *
 * Then use localhost as below
 *
 */

export class RDSRepositoryDataService {
    private pool: Pool;
    private embeddingService: EmbeddingService;

    constructor() {
        this.pool = new Pool({
            user: process.env.POSTGRES_USER || "postgres",
            host: process.env.POSTGRES_HOST || "localhost",
            database: process.env.POSTGRES_DATABASE || "",
            password: process.env.POSTGRES_PASSWORD || "imWErJY0amCCGjGhNvEL",
            port: parseInt(process.env.POSTGRES_PORT || "5432"),
            ssl:
                process.env.POSTGRES_SSL === "true"
                    ? {
                          rejectUnauthorized: false,
                      }
                    : undefined,
        });

        this.embeddingService = new EmbeddingService();
    }

    private formatVectorForPg(vector: number[]): string | null {
        if (!vector || !Array.isArray(vector)) return null;
        // Format the array as a PostgreSQL vector literal
        return `[${vector.join(",")}]`;
    }

    async saveBranchCommit(
        owner: string,
        repo: string,
        ref: string,
        commitHash: string
    ): Promise<void> {
        const query = `
            INSERT INTO branchcommits (owner, repo, ref, commithash)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (owner, repo, ref) 
            DO UPDATE SET commithash = EXCLUDED.commithash
        `;

        try {
            await this.pool.query(query, [owner, repo, ref, commitHash]);
        } catch (error) {
            throw new Error(`Error saving branch commit: ${(error as Error).message}`);
        }
    }

    async getBranchCommit(owner: string, repo: string, ref: string): Promise<string | null> {
        const query = `
            SELECT commithash
            FROM branchcommits
            WHERE owner = $1 AND repo = $2 AND ref = $3
        `;

        try {
            const result = await this.pool.query(query, [owner, repo, ref]);
            return result.rows[0]?.commithash || null;
        } catch (error) {
            return null;
        }
    }

    async saveFileDetails(file: FileDetails): Promise<void> {
        const formattedEmbeddings = this.formatVectorForPg(file.embeddings || []);

        const query = `
            INSERT INTO filedetails (
                name, path, content, owner, repo, ref, 
                commithash, tokencount, embeddings
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::vector)
            ON CONFLICT (owner, repo, ref, path)
            DO UPDATE SET
                name = EXCLUDED.name,
                content = EXCLUDED.content,
                commithash = EXCLUDED.commithash,
                tokencount = EXCLUDED.tokencount,
                embeddings = EXCLUDED.embeddings
        `;

        try {
            await this.pool.query(query, [
                file.name,
                file.path,
                file.content,
                file.owner,
                file.repo,
                file.ref,
                file.commitHash,
                file.tokenCount,
                formattedEmbeddings,
            ]);
        } catch (error) {
            throw new Error(`Error saving file details: ${(error as Error).message}`);
        }
    }

    async getFileDetails(
        owner: string,
        repo: string,
        ref: string = "main",
        path: string
    ): Promise<FileDetails | null> {
        const query = `
            SELECT *
            FROM filedetails
            WHERE owner = $1 AND repo = $2 AND ref = $3 AND path = $4
        `;

        try {
            const result = await this.pool.query(query, [owner, repo, ref, path]);
            if (result.rows.length === 0) return null;

            const row = result.rows[0];
            return {
                name: row.name,
                path: row.path,
                content: row.content,
                owner: row.owner,
                repo: row.repo,
                ref: row.ref,
                commitHash: row.commithash,
                tokenCount: row.tokencount,
                embeddings: row.embeddings,
            };
        } catch (error) {
            return null;
        }
    }

    async getAllFileDetails(
        owner: string,
        repo: string,
        ref: string = "main"
    ): Promise<FileDetails[]> {
        const query = `
            SELECT *
            FROM filedetails
            WHERE owner = $1 AND repo = $2 AND ref = $3
        `;

        try {
            const result = await this.pool.query(query, [owner, repo, ref]);
            return result.rows.map((row) => ({
                name: row.name,
                path: row.path,
                content: row.content,
                owner: row.owner,
                repo: row.repo,
                ref: row.ref,
                commitHash: row.commithash,
                tokenCount: row.tokencount,
                embeddings: row.embeddings,
            }));
        } catch (error) {
            throw new Error(`Error fetching all file details: ${(error as Error).message}`);
        }
    }

    async findSimilar(
        text: string,
        owner: string,
        repo: string,
        ref: string
    ): Promise<FileDetails[]> {
        const embeddings = await this.embeddingService.generateEmbeddings(text);
        const formattedEmbeddings = this.formatVectorForPg(embeddings);

        const query = `
            SELECT * FROM find_similar_files($1, $2, $3, $4::vector)
        `;

        try {
            const result = await this.pool.query(query, [owner, repo, ref, formattedEmbeddings]);
            return result.rows.map((row) => ({
                name: row.name,
                path: row.path,
                content: row.content,
                owner: row.owner,
                repo: row.repo,
                ref: row.ref,
                commitHash: row.commithash,
                tokenCount: row.tokencount,
                similarity: row.similarity,
            }));
        } catch (error) {
            throw new Error(`Error finding similar files: ${(error as Error).message}`);
        }
    }

    async close(): Promise<void> {
        await this.pool.end();
    }
}
