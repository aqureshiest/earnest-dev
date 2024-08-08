import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { EmbeddingService } from "../ai/EmbeddingService";

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
                author: file.author, // Include author
            },
            {
                onConflict: "owner,repo,ref,path",
            }
        );

        if (error) {
            throw new Error(`Error saving file details: ${error.message}`);
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
            author: data.author, // Include author
        } as FileDetails;
    }

    // Other methods remain unchanged...
}
