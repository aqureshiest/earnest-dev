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

    async saveBranch(branch: StoredBranch) {
        const { data, error } = await this.supabase
            .from("branches")
            .upsert(
                {
                    owner: branch.owner,
                    repo: branch.repo,
                    ref: branch.ref,
                    commithash: branch.commitHash,
                },
                {
                    onConflict: "owner,repo,ref",
                }
            )
            .select()
            .single();

        if (error) {
            throw new Error(`Error saving branch: ${error.message}`);
        }

        return data;
    }

    async getBranch(owner: string, repo: string, ref: string): Promise<StoredBranch | null> {
        const { data, error } = await this.supabase
            .from("branches")
            .select("*")
            .eq("owner", owner)
            .eq("repo", repo)
            .eq("ref", ref)
            .single();

        if (error) {
            // console.error(`Error fetching branch: ${error.message}`);
            return null;
        }

        return {
            id: data.id,
            owner: data.owner,
            repo: data.repo,
            ref: data.ref,
            commitHash: data.commithash,
        } as StoredBranch;
    }

    async saveFileDetails(file: FileDetails): Promise<void> {
        const { data, error } = await this.supabase
            .from("filedetails")
            .upsert(
                {
                    name: file.name,
                    path: file.path,
                    content: file.content,
                    branchid: file.branch.id,
                    commithash: file.commitHash,
                    tokencount: file.tokenCount,
                    embeddings: file.embeddings,
                },
                {
                    onConflict: "branchid,path",
                }
            )
            .select()
            .single();

        if (error) {
            throw new Error(`Error saving file details: ${error.message}`);
        }

        return data;
    }

    async getFileDetails(branchId: string, path: string): Promise<FileDetails | null> {
        const { data, error } = await this.supabase
            .from("filedetails")
            .select("*")
            .eq("branchid", branchId)
            .eq("path", path)
            .single();

        if (error) {
            // console.error(`Error fetching file ${repo}:${ref}:${path} details: ${error.message}`);
            return null;
        }

        return {
            id: data.id,
            name: data.name,
            path: data.path,
            content: data.content,
            branch: { id: data.branchid },
            commitHash: data.commithash,
            tokenCount: data.tokencount,
            embeddings: data.embeddings,
        } as FileDetails;
    }

    async getAllFiles(branchId: string): Promise<FileDetails[]> {
        const { data, error } = await this.supabase
            .from("filedetails")
            .select("*")
            .eq("branchId", branchId);

        if (error) {
            throw new Error(`Error fetching all file details: ${error.message}`);
        }

        return data as FileDetails[];
    }

    async findSimilar(text: string, topK: number = 5, branchId: string): Promise<FileDetails[]> {
        const embeddings = await this.embeddingService.generateEmbeddings(text);

        const { data, error } = await this.supabase.rpc("find_similar_files", {
            query_embeddings: embeddings,
            top_k: topK,
            given_branch_id: branchId,
        });

        // console.log(data);

        if (error) {
            throw new Error(`Error finding similar files: ${error.message}`);
        }

        return data as FileDetails[];
    }
}
