import { chunk } from "lodash";
import { FileChunk } from "../ai/support/CodeIndexer";
import { Pool } from "pg";

export class RepositoryDataService {
    private pool: Pool;

    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
        });

        // Add event listener for connection errors
        this.pool.on("error", (err) => {
            console.error("Unexpected error on idle client", err);
        });
    }

    async saveBranchCommit(owner: string, repo: string, ref: string, commitHash: string) {
        const query = `
      INSERT INTO branchcommits (owner, repo, ref, commithash)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (owner, repo, ref) DO UPDATE
      SET commithash = $4
    `;

        try {
            await this.pool.query(query, [owner, repo, ref, commitHash]);
        } catch (error: any) {
            throw new Error(`Error saving branch commit: ${error.message}`);
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
            if (result.rows.length === 0) {
                return null;
            }
            return result.rows[0].commithash || null;
        } catch (error) {
            return null;
        }
    }

    async saveFileDetails(file: FileDetails): Promise<number> {
        const query = `
          INSERT INTO filedetails (name, path, content, owner, repo, ref, commithash, tokencount)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (owner, repo, ref, path) DO UPDATE
          SET name = EXCLUDED.name, 
              content = EXCLUDED.content, 
              commithash = EXCLUDED.commithash, 
              tokencount = EXCLUDED.tokencount
          RETURNING id
        `;

        try {
            const result = await this.pool.query(query, [
                file.name,
                file.path,
                file.content,
                file.owner,
                file.repo,
                file.ref,
                file.commitHash,
                file.tokenCount,
            ]);

            return result.rows[0].id;
        } catch (error: any) {
            throw new Error(`Error saving file details ${file.path}: ${error.message}`);
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
            if (result.rows.length === 0) {
                return null;
            }

            const data = result.rows[0];
            return {
                name: data.name,
                path: data.path,
                content: data.content,
                owner: data.owner,
                repo: data.repo,
                ref: data.ref,
                commitHash: data.commithash,
                tokenCount: data.tokencount,
                embeddings: data.embeddings,
            } as FileDetails;
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

            return result.rows.map(
                (file) =>
                    ({
                        name: file.name,
                        path: file.path,
                        content: file.content,
                        owner: file.owner,
                        repo: file.repo,
                        ref: file.ref,
                        commitHash: file.commithash,
                        tokenCount: file.tokencount,
                    } as FileDetails)
            );
        } catch (error: any) {
            console.error(`Error fetching all file details: ${error}, ${owner}, ${repo}, ${ref}`);
            throw new Error(`Error fetching all file details: ${error}`);
        }
    }

    async saveFileChunks(chunks: FileChunk[]): Promise<void> {
        try {
            // For bulk inserts, use a client to handle the transaction
            const client = await this.pool.connect();
            try {
                await client.query("BEGIN");

                for (const chunk of chunks) {
                    const query = `
                    INSERT INTO filechunks (fileid, chunkindex, path, content, owner, repo, ref, tokencount, embeddings)    
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::vector)
                    `;

                    // Format embeddings array as string with square brackets
                    const embedArray = `[${chunk.embeddings?.join(",")}]`;

                    await client.query(query, [
                        chunk.fileId,
                        chunk.chunkIndex,
                        chunk.path,
                        chunk.content,
                        chunk.owner,
                        chunk.repo,
                        chunk.ref,
                        chunk.tokenCount,
                        embedArray,
                    ]);
                }

                await client.query("COMMIT");
            } catch (error) {
                await client.query("ROLLBACK");
                throw error;
            } finally {
                client.release();
            }
        } catch (error: any) {
            console.error(`Error saving file chunks:`, error);
            throw new Error(`Error saving file chunks: ${error.message}`);
        }
    }

    async getFileChunks(
        owner: string,
        repo: string,
        ref: string,
        path: string
    ): Promise<FileChunk[]> {
        const query = `
      SELECT *
      FROM filechunks
      WHERE owner = $1 AND repo = $2 AND ref = $3 AND path = $4
    `;

        try {
            const result = await this.pool.query(query, [owner, repo, ref, path]);
            return result.rows;
        } catch (error: any) {
            console.error(`Error fetching all file chunks:`, error);
            return [];
        }
    }

    async deleteFileChunks(owner: string, repo: string, ref: string, path: string): Promise<void> {
        const query = `
      DELETE FROM filechunks
      WHERE owner = $1 AND repo = $2 AND ref = $3 AND path = $4
    `;

        try {
            await this.pool.query(query, [owner, repo, ref, path]);
        } catch (error: any) {
            console.error(`Error deleting all file chunks:`, error);
        }
    }

    async findSimilarFilesByChunks(
        query: string,
        owner: string,
        repo: string,
        ref: string,
        embeddings: number[],
        similarityThreshold = 0.1
    ): Promise<FileDetails[]> {
        try {
            console.log("Searching for similar chunks in", owner, repo, ref, "for query:", query);

            // Use the function to find similar chunks grouped by file
            const findSimilarChunksQuery = `SELECT * FROM find_similar_chunks($1, $2, $3, $4::vector)`;

            // Convert the embeddings array properly for PostgreSQL vector type
            const embedArray = `[${embeddings.join(",")}]`;

            const similarFilesResult = await this.pool.query(findSimilarChunksQuery, [
                owner,
                repo,
                ref,
                embedArray,
            ]);

            const similarFiles = similarFilesResult.rows;

            if (!similarFiles || similarFiles.length === 0) {
                console.log("No similar chunks found");
                return [];
            }

            // Fetch full file details for the similar files
            const fileIds = similarFiles
                .filter((f: any) => f.similarity > similarityThreshold)
                .map((f: any) => f.file_id);

            if (fileIds.length === 0) {
                return [];
            }

            const filesQuery = `
        SELECT *
        FROM filedetails
        WHERE id = ANY($1)
      `;

            const filesResult = await this.pool.query(filesQuery, [fileIds]);
            const files = filesResult.rows;

            if (!files || files.length === 0) {
                return [];
            }

            // Map similarity scores to the files
            const filesToUse = files
                .map((file) => {
                    const similarityMatch = similarFiles.find((sf: any) => sf.file_id === file.id);
                    return {
                        ...file,
                        similarity: similarityMatch ? similarityMatch.similarity : 0,
                    };
                })
                .sort((a, b) => (b.similarity || 0) - (a.similarity || 0));

            // console.log(
            //     "\n-- Files to use based on similarity search:---\n",
            //     filesToUse.map((f) => `${f.path} - ${f.similarity}`).join("\n")
            // );

            return filesToUse;
        } catch (error: any) {
            console.error("Error in chunked similarity search:", error.message);
            throw error;
        }
    }
}
