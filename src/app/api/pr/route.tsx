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
        await sendMessage(channel, ">IC");
        await sendMessage(channel, `Fetched ${files.length} files.`);

        // New logic to check and save branch commit
        const existingCommitHash = await dbService.getBranchCommit(owner, repo, branch);
        if (existingCommitHash) {
            await sendMessage(channel, "Branch commit exists, skipping indexing.");
        } else {
            // Proceed with indexing and save the commit hash
            await sendMessage(channel, "Tokenizing files...");
            const filesWithContent: FileDetails[] = await repositoryService.fetchFiles(files);
            const tokenizedFiles: FileDetails[] = new TokenLimiter().tokenizeFiles(filesWithContent);

            // Check if token limits removed any files
            if (tokenizedFiles.length < filesWithContent.length) {
                await sendMessage(
                    channel,
                    `Removed ${filesWithContent.length - tokenizedFiles.length} files from context due to token limits.`
                );
            }

            await sendMessage(channel, "Embedding files...");
            const filesWithEmbeddings = await embeddingService.generateEmbeddingsForFilesInChunks(
                tokenizedFiles
            );

            await sendMessage(channel, "Syncing files...");
            filesWithEmbeddings.forEach(async (file) => {
                await dbService.saveFileDetails(file);
            });

            // Save the branch commit after indexing
            await dbService.saveBranchCommit(owner, repo, branch, "current_commit_hash"); // Replace with actual commit hash
        }

        // ... existing logic for AI Assistants and PR creation
    } catch (e) {
        console.log(e);
        return new Response(JSON.stringify({ error: (e as any).message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
