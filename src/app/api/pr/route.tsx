import { EmbeddingService } from "@/modules/ai/support/EmbeddingService";
import PullRequestService from "@/modules/github/PullRequestService";
import { RepositoryService } from "@/modules/github/RepositoryService";
import Ably from "ably";
import { DatabaseService } from "@/modules/db/SupDatabaseService";
import { TokenLimiter } from "@/modules/ai/support/TokenLimiter";
import { AssistantsWorkflow } from "@/modules/ai/AssistantsWorkflow";

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
        const files: FileDetails[] = await repositoryService.getRepositoryFiles(
            owner,
            repo,
            branch,
            "",
            skipFolders,
            skipFiles,
            channel
        );
        await sendMessage(channel, ">IC"); // Indexing completed
        await sendMessage(channel, `Fetched ${files.length} files.`);

        // Check if the current commit hash matches the stored commit hash
        const storedFileDetails = await dbService.getFileDetails(owner, repo, branch, "path/to/file");
        if (storedFileDetails && storedFileDetails.branchCommitHash === currentCommitHash) {
            console.log("Skipping indexing as commit hash matches.");
            // Logic to find similar files
        } else {
            // Proceed with indexing
        }

        // ... (rest of the existing code)
    } catch (e) {
        console.log(e);
        return new Response(JSON.stringify({ error: (e as any).message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
