import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { ExtensionConfig } from "./types";

export class ExtensionDataStore {
    private supabase: SupabaseClient;

    constructor() {
        this.supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
    }

    async loadExtensionConfig(extensionId: string): Promise<ExtensionConfig> {
        const { data, error } = await this.supabase
            .from("extensions")
            .select("*")
            .eq("id", extensionId)
            .single();

        if (error || !data) {
            throw new Error(`Failed to load extension config: ${error?.message || "Not found"}`);
        }

        return {
            ...data,
            systemPrompt: data.system_prompt,
            uiConfig: data.ui_config,
            outputSchema: {
                ...data.output_schema,
            },
        };
    }

    async saveExtensionConfig(config: any) {
        const extensionConfig = {
            id: config.id,
            name: config.name,
            description: config.description,
            system_prompt: config.systemPrompt,
            output_schema: config.outputSchema,
            ui_config: config.uiConfig,
            capabilities: config.capabilities,
            created_at: new Date().toISOString(),
        };

        const { data, error } = await this.supabase
            .from("extensions")
            .insert(extensionConfig)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to save extension: ${error.message}`);
        }

        return data;
    }
}
