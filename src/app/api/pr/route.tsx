import { CodingAssistant } from "@/modules/ai/CodingAssistant";
import { EmbeddingService } from "@/modules/ai/EmbeddingService";
import { PlannerAssistant } from "@/modules/ai/PlannerAssistant";
import PullRequestService from "@/modules/github/PullRequestService";
import { RepositoryService } from "@/modules/github/RepositoryService";
import Ably from "ably";
import { DatabaseService } from "@/modules/db/SupDatabaseService";
import { BranchService } from "@/modules/github/BranchService";
import { TokenLimiter } from "@/modules/ai/TokenLimiter";

// private function to send message to ably
async function sendMessage(channel: any, message: string, messagePrefix = "progress") {
    await channel.publish(messagePrefix, message);
}

export async function POST(req: Request) {
    const MAX_SIMIALAR_FILES = 50;

    // Initialize services
    const repositoryService = new RepositoryService();
    const dbService = new DatabaseService();
    const embeddingService = new EmbeddingService();
    const branchService = new BranchService();

    // Initialize assistants
    const planner = new PlannerAssistant();
    const coder = new CodingAssistant();

    // Parse request body
    const { owner, repo, branch, description, selectedModel, useAllFiles } = await req.json();

    // Initialize Ably for realtime updates
    const ably = new Ably.Rest(process.env.NEXT_PUBLIC_ABLY_API_KEY!);

    try {
        let filesToUse = [];

        const channel = ably.channels.get("generate-pr-channel");
        await sendMessage(channel, "Starting to create pull request...");

        // Check if branch is up to date
        const { upToDate: branchUpToDate, branch: storedBranch } =
            await branchService.prepareBranchForPR(owner, repo, branch);
        console.log("branchUpToDate", branchUpToDate);
        console.log("storedBranch", storedBranch);

        if (!storedBranch || !storedBranch.id) {
            throw new Error(`Unable to prepare branch ${branch} for PR`);
        }

        // if branch up to date then download, prepare and save all files
        if (!branchUpToDate) {
            // Fetch files from repository
            await sendMessage(channel, "Fetching repository...");
            const files: FileDetails[] = await repositoryService.getRepositoryFiles(storedBranch);
            await sendMessage(channel, `Fetched ${files.length} files.`);

            // Tokenize files
            await sendMessage(channel, "Tokenizing files...");
            const filesWithContent: FileDetails[] = await repositoryService.fetchFiles(
                storedBranch,
                files
            );
            const tokenizedFiles: FileDetails[] = await TokenLimiter.tokenizeFiles(
                filesWithContent
            );

            // Embed files
            await sendMessage(channel, "Embedding files...");
            const filesWithEmbeddings = await embeddingService.generateEmbeddingsForFiles(
                tokenizedFiles
            );

            // Save files to database
            filesWithEmbeddings.forEach(async (file) => {
                await dbService.saveFileDetails(file);
            });
        } else {
            await sendMessage(channel, "Branch is up to date. Ready to process...");
        }

        // process all files
        if (useAllFiles) {
            // get all files from database
            filesToUse = await dbService.getAllFiles(storedBranch.id);
            await sendMessage(channel, `Operating on all ${filesToUse.length} files.`);
        }
        // process only relevant files
        else {
            await sendMessage(channel, `Looking for relevant files...`);
            filesToUse = await dbService.findSimilar(
                description,
                MAX_SIMIALAR_FILES,
                storedBranch.id
            );
            await sendMessage(channel, `Top relevant files...`);
            // show only the top few files
            filesToUse.slice(0, 3).forEach(async (file) => {
                await sendMessage(channel, `*${file.name}`);
            });
        }

        await sendMessage(channel, "Generating plan...");
        const {
            plan,
            calculatedTokens: planCTokens,
            inputTokens: planITokens,
            outputTokens: planOTokens,
            cost: planCost,
        } = await planner.executePlan(selectedModel, description, filesToUse);
        await sendMessage(channel, "Implementation plan ready.");
        await sendMessage(channel, `*Approximated tokens: ${planCTokens}`);
        await sendMessage(channel, `*Actual Input tokens: ${planITokens}`);
        await sendMessage(channel, `*Actual Output tokens: ${planOTokens}`);
        await sendMessage(channel, `*Cost: $${planCost.toFixed(6)}`);

        await sendMessage(channel, "Generating code...");
        const {
            codeChanges,
            calculatedTokens: codeCTokens,
            inputTokens: codeITokens,
            outputTokens: codeOTokens,
            cost: codeCost,
        } = (await coder.generateCode(selectedModel, description, plan, filesToUse)) || {};

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
            await sendMessage(channel, `*Cost: $${codeCost?.toFixed(6)}`);

            await sendMessage(channel, "Creating pull request...");
            const prService = new PullRequestService(owner, repo, branch);
            const prLink = await prService.createPullRequest(
                codeChanges,
                codeChanges.prTitle,
                `${description}\n\n${plan}`
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
