import { createClient, SupabaseClient } from "@supabase/supabase-js";

export class RunLogsDataService {
    private supabase: SupabaseClient;

    constructor() {
        this.supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
    }
}
