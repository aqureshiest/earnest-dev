import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { FileChunk } from "../ai/support/CodeIndexer";

export class RepositoryDataService {
    protected supabase: SupabaseClient;

    constructor() {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            throw new Error("Missing Supabase environment variables");
        }

        this.supabase = createClient(supabaseUrl, supabaseKey, {
            auth: {
                persistSession: false, // Since we're using service role, we don't need to persist sessions
            },
        });
    }

    async saveBranchCommit(owner: string, repo: string, ref: string, commitHash: string) {
        const { data, error } = await this.supabase.from("branchcommits").upsert(
            {
                owner,
                repo,
                ref,
                commithash: commitHash,
            },
            {
                onConflict: "owner,repo,ref",
            }
        );

        if (error) {
            throw new Error(`Error saving branch commit: ${error.message}`);
        }
    }

    async getBranchCommit(owner: string, repo: string, ref: string): Promise<string | null> {
        const { data, error } = await this.supabase
            .from("branchcommits")
            .select("commithash")
            .eq("owner", owner)
            .eq("repo", repo)
            .eq("ref", ref)
            .single();

        if (error || !data) {
            return null;
        }

        return data.commithash ?? null;
    }

    async saveFileDetails(file: FileDetails): Promise<void> {
        const { data, error } = await this.supabase.from("filedetails").upsert(
            {
                name: file.name,
                path: file.path,
                content: file.content,
                owner: file.owner,
                repo: file.repo,
                ref: file.ref,
                commithash: file.commitHash,
                tokencount: file.tokenCount,
            },
            {
                onConflict: "owner,repo,ref,path",
            }
        );

        if (error) {
            throw new Error(`Error saving file details ${file.path}: ${error.message}`);
        }
    }

    async getFileDetails(
        owner: string,
        repo: string,
        ref: string = "main",
        path: string
    ): Promise<FileDetails | null> {
        const { data, error } = await this.supabase
            .from("filedetails")
            .select("*")
            .eq("owner", owner)
            .eq("repo", repo)
            .eq("ref", ref)
            .eq("path", path)
            .single();

        if (error) {
            // console.error(`Error fetching file ${repo}:${ref}:${path} details: ${error.message}`);
            return null;
        }

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
    }

    async getAllFileDetails(
        owner: string,
        repo: string,
        ref: string = "main"
    ): Promise<FileDetails[]> {
        const { data, error } = await this.supabase
            .from("filedetails")
            .select("*")
            .eq("owner", owner)
            .eq("repo", repo)
            .eq("ref", ref);

        if (error) {
            throw new Error(`Error fetching all file details: ${error.message}`);
        }

        return data.map(
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
    }

    // async findSimilar(
    //     text: string,
    //     owner: string,
    //     repo: string,
    //     ref: string,
    //     embeddings?: number[]
    // ): Promise<FileDetails[]> {
    //     const { data, error } = await this.supabase.rpc("find_similar_files", {
    //         query_embeddings: embeddings,
    //         given_owner: owner,
    //         given_repo: repo,
    //         given_ref: ref,
    //     });

    //     if (error) {
    //         throw new Error(`Error finding similar files: ${error.message}`);
    //     }

    //     return data as FileDetails[];
    // }

    async getAllFileChunks(owner: string, repo: string, ref: string): Promise<FileChunk[]> {
        const { data, error } = await this.supabase
            .from("filechunks")
            .select("*")
            .eq("owner", owner)
            .eq("repo", repo)
            .eq("ref", ref);

        if (error) {
            console.error(`Error fetching all file chunks:`, error);
            return [];
        }

        return data;
    }

    async deleteAllFileChunks(owner: string, repo: string, ref: string): Promise<void> {
        const { error } = await this.supabase
            .from("filechunks")
            .delete()
            .eq("owner", owner)
            .eq("repo", repo)
            .eq("ref", ref);

        if (error) {
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

            // Use RPC function to find similar chunks grouped by file
            const { data: similarFiles, error } = await this.supabase.rpc("find_similar_chunks", {
                given_owner: owner,
                given_repo: repo,
                given_ref: ref,
                query_embeddings: embeddings,
            });

            if (error) {
                console.error("Error finding similar chunks:", error);
                throw new Error(`Error finding similar chunks: ${error.message}`);
            }

            if (!similarFiles || similarFiles.length === 0) {
                console.log("No similar chunks found");
                return [];
            }

            // Fetch full file details for the similar files
            const fileIds = similarFiles
                .filter((f: any) => f.similarity > similarityThreshold)
                .map((f: any) => f.file_id);
            const { data: files, error: filesError } = await this.supabase
                .from("filedetails")
                .select("*")
                .in("id", fileIds);

            if (filesError || !files) {
                console.error("Error fetching full files:", filesError);
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

            console.log(
                "\n-- Files to use based on similarity search:---\n",
                filesToUse.map((f) => `${f.path} - ${f.similarity}`).join("\n")
            );

            return filesToUse;
        } catch (error) {
            console.error("Error in chunked similarity search:", error);
            throw error;
        }
    }
}
