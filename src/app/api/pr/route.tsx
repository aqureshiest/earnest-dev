import { EmbeddingService } from "@/modules/ai/support/EmbeddingService";
import PullRequestService from "@/modules/github/PullRequestService";
import { RepositoryService } from "@/modules/github/RepositoryService";
import Ably from "ably";
import { DatabaseService } from "@/modules/db/SupDatabaseService";
import { TokenLimiter } from "@/modules/ai/support/TokenLimiter";
import { AssistantsWorkflow } from "@/modules/ai/AssistantsWorkflow";
import { skip } from "node:test";

// private function to send message to ably
async function sendMessage(channel: any, message: string, messagePrefix = "overall") {
    await channel.publish(messagePrefix, message);
}

export async function POST(req: Request) {
    const repositoryService = new RepositoryService();
    const dbService = new DatabaseService();
    const embeddingService = new EmbeddingService();

    const {
        owner,
        repo,
        branch,
        description,
        selectedModel,
        useAllFiles,
        skipFolders,
        skipFiles,
        updatesChannel,
    } = await req.json();

    const ably = new Ably.Rest(process.env.NEXT_PUBLIC_ABLY_API_KEY!);

    try {
        const channel = ably.channels.get(updatesChannel);

        await sendMessage(channel, "Indexing repository...");
        
        // Check if the current commit hash matches the one stored in the new table
        const currentCommitHash = await repositoryService.getCurrentCommitHash(owner, repo, branch);
        const storedCommitHash = await dbService.getBranchCommit(owner, repo, branch);

        if (storedCommitHash === currentCommitHash) {
            await sendMessage(channel, "Skipping indexing as commit hash matches.");
            // Use similar search query instead
            const filesToUse = await dbService.findSimilar(description, owner, repo, branch);
            // Proceed with using filesToUse for the pull request
        } else {
            // Proceed with indexing
            await sendMessage(channel, "Indexing repository...");
            const files: FileDetails[] = await repositoryService.getRepositoryFiles(
                owner,
                repo,
                branch,
                "",
                skipFolders,
                skipFiles,
                channel
            );
            await sendMessage(channel, ">IC"); // this is a system command: Indexing completed
            await sendMessage(channel, `Fetched ${files.length} files.`);

            // ... (rest of the existing code)
            
            // Save the current commit hash to the new table after indexing
            await dbService.saveBranchCommit(owner, repo, branch, currentCommitHash);
        }

        return new Response(JSON.stringify({ prLink: null, message: "No code changes needed" }), {
            headers: { "Content-Type": "application/json" },
        });
    } catch (e) {
        console.log(e);
        return new Response(JSON.stringify({ error: (e as any).message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}