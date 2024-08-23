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

    const { owner, repo, branch, description, selectedModel, useAllFiles, updatesChannel } =
        await req.json();

    const ably = new Ably.Rest(process.env.NEXT_PUBLIC_ABLY_API_KEY!);

    try {
        const channel = ably.channels.get(updatesChannel);

        await sendMessage(channel, "Indexing repository...");
        const files: FileDetails[] = await repositoryService.getRepositoryFiles(
            owner,
            repo,
            branch,
            "",
            channel
        );

        // Check if the branch commit exists
        const commitHash = files[0]?.commitHash; // Assuming we get the commit hash from the first file
        const commitExists = await dbService.checkBranchCommitExists(owner, repo, branch);

        if (commitExists) {
            await sendMessage(channel, "Skipping indexing as the branch commit already exists.");
            return new Response(JSON.stringify({ prLink: null, message: "No indexing needed" }), {
                headers: { "Content-Type": "application/json" },
            });
        }

        await sendMessage(channel, ">IC");
        await sendMessage(channel, `Fetched ${files.length} files.`);

        // Save the branch commit
        await dbService.saveBranchCommit(owner, repo, branch, commitHash);

        await sendMessage(channel, "Tokenizing files...");
        const filesWithContent: FileDetails[] = await repositoryService.fetchFiles(files);
        const tokenizedFiles: FileDetails[] = new TokenLimiter().tokenizeFiles(filesWithContent);

        // ... existing logic ...
    } catch (e) {
        console.log(e);
        return new Response(JSON.stringify({ error: (e as any).message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
