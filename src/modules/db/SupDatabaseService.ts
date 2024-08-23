import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { EmbeddingService } from "../ai/support/EmbeddingService";

export class DatabaseService {
    private supabase: SupabaseClient;
    private embeddingService: EmbeddingService;

    constructor() {
        this.supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        this.embeddingService = new EmbeddingService();
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
                embeddings: file.embeddings,
            },
            {
                onConflict: "owner,repo,ref,path",
            }
        );

        if (error) {
            throw new Error(`Error saving file details: ${error.message}`);
        }
    }

    async getBranchCommit(owner: string, repo: string, branch: string): Promise<string | null> {
        const { data, error } = await this.supabase
            .from("BranchCommits")
            .select("commitHash")
            .eq("owner", owner)
            .eq("repo", repo)
            .eq("branch", branch)
            .single();

        if (error) {
            console.error(`Error fetching branch commit: ${error.message}`);
            return null;
        }

        return data?.commitHash || null;
    }

    async insertOrUpdateBranchCommit(owner: string, repo: string, branch: string, commitHash: string): Promise<void> {
        const { data, error } = await this.supabase.from("BranchCommits").upsert(
            {
                owner,
                repo,
                branch,
                commitHash,
            },
            {
                onConflict: "owner,repo,branch",
            }
        );

        if (error) {
            throw new Error(`Error inserting/updating branch commit: ${error.message}`);
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

        return data as FileDetails[];
    }

    async findSimilar(
        text: string,
        owner: string,
        repo: string,
        ref: string
    ): Promise<FileDetails[]> {
        const embeddings = await this.embeddingService.generateEmbeddings(text);

        const { data, error } = await this.supabase.rpc("find_similar_files", {
            query_embeddings: embeddings,
            given_owner: owner,
            given_repo: repo,
            given_ref: ref,
        });

        if (error) {
            throw new Error(`Error finding similar files: ${error.message}`);
        }

        return data as FileDetails[];
    }
}