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
        const { data, error } = await this.supabase.from("BranchCommits").upsert({
            owner,
            repo,
            branch,
            commitHash,
        });

        if (error) {
            throw new Error(`Error saving branch commit: ${error.message}`);
        }
    }

    async checkBranchCommitExists(owner: string, repo: string, branch: string): Promise<boolean> {
        const { data, error } = await this.supabase
            .from("BranchCommits")
            .select("*")
            .eq("owner", owner)
            .eq("repo", repo)
            .eq("branch", branch)
            .single();

        if (error && error.code !== 'PGRST116') { // No rows found
            throw new Error(`Error checking branch commit: ${error.message}`);
        }

        return data !== null;
    }

    // ... existing methods ...
}
