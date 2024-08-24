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
                branchCommitHash: file.branchCommitHash, // New field
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

    async updateBranchCommitHash(owner: string, repo: string, ref: string, commitHash: string): Promise<void> {
        const { data, error } = await this.supabase
            .from("filedetails")
            .update({ branchCommitHash: commitHash })
            .eq("owner", owner)
            .eq("repo", repo)
            .eq("ref", ref);

        if (error) {
            throw new Error(`Error updating branch commit hash: ${error.message}`);
        }
    }

    // ... (rest of the existing code)
}
