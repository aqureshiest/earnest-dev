import { CodingAssistant } from "@/modules/ai/CodingAssistant";
import { EmbeddingService } from "@/modules/ai/EmbeddingService";
import { PlannerAssistant } from "@/modules/ai/PlannerAssistant";
import PullRequestService from "@/modules/github/PullRequestService";
import { RepositoryService } from "@/modules/github/RepositoryService";
import { encode } from "gpt-tokenizer";
import Ably from "ably";
import { DatabaseService } from "@/modules/db/SupDatabaseService";

async function tokenizeFiles(files: FileDetails[]) {
    return files
        .map((file) => {
            // no need to tokenize if tokene count is already there
            if (file.tokenCount) {
                return file;
            }

            console.log("Tokenizing file >>", file.path);
            const tokens = encode(file.content);
            return {
                ...file,
                tokenCount: tokens.length,
            };
        })
        .filter((file) => file.tokenCount! > 0 && file.tokenCount! < 8000);
}

// private function to send message to ably
async function sendMessage(channel: any, message: string, messagePrefix = "progress") {
    await channel.publish(messagePrefix, message);
}

export async function POST(req: Request) {
    const repositoryService = new RepositoryService();
    const dbService = new DatabaseService();
    const embeddingService = new EmbeddingService();

    const planner = new PlannerAssistant();
    const coder = new CodingAssistant();

    const { owner, repo, branch, description, selectedModel, useAllFiles, author } = await req.json(); // Include author

    const ably = new Ably.Rest(process.env.NEXT_PUBLIC_ABLY_API_KEY!);

    try {
        const channel = ably.channels.get("generate-pr-channel");
        await sendMessage(channel, "Starting to create pull request...");

        await sendMessage(channel, "Fetching repository...");
        const files: FileDetails[] = await repositoryService.getRepositoryFiles(
            owner,
            repo,
            branch
        );
        await sendMessage(channel, `Fetched ${files.length} files.`);

        await sendMessage(channel, "Tokenizing files...");
        const filesWithContent: FileDetails[] = await repositoryService.fetchFiles(files);
        const tokenizedFiles: FileDetails[] = await tokenizeFiles(filesWithContent);

        await sendMessage(channel, "Embedding files...");
        const filesWithEmbeddings = await embeddingService.generateEmbeddingsForFiles(
            tokenizedFiles
        );

        filesWithEmbeddings.forEach(async (file) => {
            await dbService.saveFileDetails(file);
        });

        let filesToUse = [];

        if (!useAllFiles) {
            try {
                console.log("Finding similar files in database");
                filesToUse = await dbService.findSimilar(description, 5, owner, repo, branch);
                await sendMessage(channel, `Limiting context to ${filesToUse.length} files.`);
            } catch (e) {
                console.log("Error in finding similar files", e);
                filesToUse = filesWithEmbeddings;
            }
        } else {
            filesToUse = filesWithEmbeddings;
        }

        await sendMessage(channel, "Generating plan...");
        const {
            plan,
            calculatedTokens: planCTokens,
            inputTokens: planITokens,
            outputTokens: planOTokens,
            cost: planCost,
        } = await planner.executePlan(selectedModel, description, filesWithEmbeddings);
        await sendMessage(channel, "Implementation plan ready.");
        await sendMessage(channel, `*Approximated tokens: ${planCTokens}`);
        await sendMessage(channel, `*Actual Input tokens: ${planITokens}`);
        await sendMessage(channel, `*Actual Output tokens: ${planOTokens}`);
        await sendMessage(channel, `*Cost: ${planCost.toFixed(6)}`);

        await sendMessage(channel, "Generating code...");
        const {
            codeChanges,
            calculatedTokens: codeCTokens,
            inputTokens: codeITokens,
            outputTokens: codeOTokens,
            cost: codeCost,
        } = (await coder.generateCode(selectedModel, description, plan, filesWithEmbeddings)) || {};

        if (
            codeChanges &&
            (codeChanges?.newFiles.length > 0 ||
                codeChanges?.modifiedFiles.length > 0 ||
                codeChanges?.deletedFiles.length > 0)
        ) {
            await sendMessage(channel, "Code ready.");
            await sendMessage(channel, `*Approximated tokens: ${codeCTokens}`);
            await sendMessage(channel, `*Actual Input tokens: ${codeITokens}`);
            await sendMessage(channel, `*Actual Output tokens: ${codeOTokens}`);
            await sendMessage(channel, `*Cost: ${codeCost?.toFixed(6)}`);

            await sendMessage(channel, "Creating pull request...");
            const prService = new PullRequestService(owner, repo, branch);
            const prLink = await prService.createPullRequest(
                codeChanges,
                codeChanges.prTitle,
                `${description}\n\n${plan}`,
                author // Pass author to the PullRequestService
            );

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

export const runtime = "edge";
