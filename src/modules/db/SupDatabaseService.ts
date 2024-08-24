import { createClient, SupabaseClient } from "@supabase/supabase-js";

export class DatabaseService {
    private supabase: SupabaseClient;

    constructor() {
        this.supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
    }

    async getBranchCommitSHA(owner: string, repo: string, branch: string): Promise<string | null> {
        const { data, error } = await this.supabase
            .from("branch_commits")
            .select("commit_sha")
            .eq("owner", owner)
            .eq("repo", repo)
            .eq("branch", branch)
            .single();

        if (error) {
            console.error("Error fetching branch commit SHA:", error);
            return null;
        }

        return data?.commit_sha || null;
    }

    async storeBranchCommitSHA(owner: string, repo: string, branch: string, commitSHA: string): Promise<void> {
        const { error } = await this.supabase
            .from("branch_commits")
            .upsert({ owner, repo, branch, commit_sha: commitSHA });

        if (error) {
            console.error("Error storing branch commit SHA:", error);
        }
    }

    // ... (rest of the existing methods)
}