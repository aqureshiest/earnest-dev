import { EmbeddingService } from "@/modules/ai/support/EmbeddingService";
import PullRequestService from "@/modules/github/PullRequestService";
import { RepositoryService } from "@/modules/github/RepositoryService";
import Ably from "ably";
import { DatabaseService } from "@/modules/db/SupDatabaseService";
import { TokenLimiter } from "@/modules/ai/support/TokenLimiter";
import { AssistantsWorkflow } from "@/modules/ai/AssistantsWorkflow";

// private function to send message to ably
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
        await sendMessage(channel, "Starting to create pull request...");

        await sendMessage(channel, "Indexing repository...");
        const files: FileDetails[] = await repositoryService.getRepositoryFiles(
            owner,
            repo,
            branch
        );
        await sendMessage(channel, `Fetched ${files.length} files.`);

        await sendMessage(channel, "Tokenizing files...");
        const filesWithContent: FileDetails[] = await repositoryService.fetchFiles(files);
        const tokenizedFiles: FileDetails[] = TokenLimiter.tokenizeFiles(filesWithContent);

        await sendMessage(channel, "Embedding files...");
        const filesWithEmbeddings = await embeddingService.generateEmbeddingsForFilesInChunks(
            tokenizedFiles
        );

        // throw new Error("Not implemented");

        filesWithEmbeddings.forEach(async (file) => {
            await dbService.saveFileDetails(file);
        });

        let filesToUse = [];

        if (!useAllFiles) {
            try {
                console.log("Using relevant files...");
                filesToUse = await dbService.findSimilar(description, owner, repo, branch);
            } catch (e) {
                console.log("Error in finding similar files", e);
                filesToUse = filesWithEmbeddings;
            }
        } else {
            filesToUse = filesWithEmbeddings;
        }

        const assistantsWorkflow = new AssistantsWorkflow(channel);

        // call the assistants workflow
        await sendMessage(channel, "Starting assistants workflow...");
        const response = await assistantsWorkflow.runWorkflow(
            selectedModel,
            description,
            filesToUse
        );

        const codeChanges = response?.code.response;

        if (
            codeChanges &&
            (codeChanges?.newFiles.length > 0 ||
                codeChanges?.modifiedFiles.length > 0 ||
                codeChanges?.deletedFiles.length > 0)
        ) {
            await sendMessage(channel, "Creating pull request...");

            const prService = new PullRequestService(owner, repo, branch);
            const prLink = await prService.createPullRequest(
                codeChanges,
                codeChanges.prTitle,
                `${description}\n\n${response.plan.responseStr}`
            );

            await sendMessage(channel, "Pull request created.");
            return new Response(JSON.stringify({ prLink }), {
                headers: { "Content-Type": "application/json" },
            });
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
