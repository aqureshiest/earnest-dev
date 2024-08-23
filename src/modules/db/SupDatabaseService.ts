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

    async saveBranchCommit(owner: string, repo: string, branch: string, commitHash: string): Promise<void> {
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
            throw new Error(`Error saving branch commit: ${error.message}`);
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

    // ... existing methods
}
