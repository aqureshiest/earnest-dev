import { EmbeddingService } from "@/modules/ai/support/EmbeddingService";
import { RepositoryService } from "@/modules/github/RepositoryService";
import Ably from "ably";
import { DatabaseService } from "@/modules/db/SupDatabaseService";
import { TokenLimiter } from "@/modules/ai/support/TokenLimiter";
import { GenerateCode } from "@/modules/ai/GenerateCode";

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

        await sendMessage(channel, "Indexing repository...");
        const files: FileDetails[] = await repositoryService.getRepositoryFiles(
            owner,
            repo,
            branch,
            "",
            channel
        );
        await sendMessage(channel, ">IC"); // this is a system command: Indexing completed
        await sendMessage(channel, `Fetched ${files.length} files.`);

        await sendMessage(channel, "Tokenizing files...");
        const filesWithContent: FileDetails[] = await repositoryService.fetchFiles(files);
        const tokenizedFiles: FileDetails[] = new TokenLimiter().tokenizeFiles(filesWithContent);

        // check if token limits removed any files
        if (tokenizedFiles.length < filesWithContent.length) {
            await sendMessage(
                channel,
                `Removed ${
                    filesWithContent.length - tokenizedFiles.length
                } files from context due to token limits.`
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

        let filesToUse = [];

        if (!useAllFiles) {
            try {
                filesToUse = await dbService.findSimilar(description, owner, repo, branch);
            } catch (e) {
                console.error("Error in finding similar files", e);
                filesToUse = filesWithEmbeddings;
            }
        } else {
            filesToUse = filesWithEmbeddings;
        }

        const codeGenerator = new GenerateCode(channel);

        // run the assistants to generate code
        await sendMessage(channel, "Starting AI Assistants...");
        const generatedCode = await codeGenerator.runWorkflow(
            selectedModel,
            description,
            filesToUse
        );

        // await sendMessage(channel, "Code generated.");
        return new Response(JSON.stringify(generatedCode), {
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
