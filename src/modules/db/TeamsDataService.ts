import { SupabaseClient, createClient } from "@supabase/supabase-js";

export class TeamsService {
    private supabase: SupabaseClient;

    constructor() {
        this.supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
    }

    async getTeams() {
        const { data, error } = await this.supabase.from("teams").select("*");

        if (error) {
            throw new Error(`Error getting teams: ${error.message}`);
        }

        return data;
    }
}
