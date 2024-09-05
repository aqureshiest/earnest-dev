import { EmbeddingService } from "@/modules/ai/support/EmbeddingService";
import { RepositoryService } from "@/modules/github/RepositoryService";
import { DatabaseService } from "@/modules/db/SupDatabaseService";
import { TokenLimiter } from "@/modules/ai/support/TokenLimiter";
import { GenerateCode } from "@/modules/ai/GenerateCode";
import { NextResponse } from "next/server";

const clients = new Map<string, ReadableStreamDefaultController<any>>();

export async function POST(req: Request) {
    const repositoryService = new RepositoryService();
    const dbService = new DatabaseService();
    const embeddingService = new EmbeddingService();

    try {
        const { taskId, owner, repo, branch, description, selectedModel } = await req.json();
        if (!taskId) {
            return NextResponse.json({ error: "Task Id is required" }, { status: 400 });
        }

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    clients.set(taskId, controller);
                    req.signal.addEventListener("abort", () => clients.delete(taskId));

                    // lets get the branch commit hash from github
                    sendTaskUpdate(taskId, "progress", "Checking branch sync status...");
                    const isSynced = await repositoryService.isBranchSynced(owner, repo, branch);
                    if (isSynced) {
                        // files ready to be processed
                        sendTaskUpdate(taskId, "progress", "Branch is already synced.");
                    } else {
                        // prepare repository for processing
                        sendTaskUpdate(taskId, "progress", "Indexing repository...");
                        const files: FileDetails[] = await repositoryService.getRepositoryFiles(
                            owner,
                            repo,
                            branch,
                            taskId
                        );
                        // sendTaskUpdate(taskId, "command", "IC"); // this is a system command: Indexing completed
                        sendTaskUpdate(taskId, "progress", `Fetched ${files.length} files.`);

                        sendTaskUpdate(taskId, "progress", "Tokenizing files...");
                        const filesWithContent: FileDetails[] = await repositoryService.fetchFiles(
                            files
                        );
                        const tokenizedFiles: FileDetails[] = new TokenLimiter().tokenizeFiles(
                            filesWithContent
                        );

                        sendTaskUpdate(taskId, "progress", "Embedding files...");
                        const filesWithEmbeddings =
                            await embeddingService.generateEmbeddingsForFilesInChunks(
                                tokenizedFiles
                            );

                        // check if token limits removed any files
                        if (filesWithEmbeddings.length < tokenizedFiles.length) {
                            sendTaskUpdate(
                                taskId,
                                "progress",
                                `Removed ${
                                    tokenizedFiles.length - filesWithEmbeddings.length
                                } files from context due to embedding token limits.`
                            );
                        }

                        // sync branch
                        sendTaskUpdate(taskId, "progress", "Syncing branch...");
                        await repositoryService.syncBranch(
                            owner,
                            repo,
                            branch,
                            filesWithEmbeddings
                        );
                    }

                    // look up files similar to the description
                    const filesToUse = await dbService.findSimilar(
                        description,
                        owner,
                        repo,
                        branch
                    );

                    // run the assistants to generate code
                    const codeGenerator = new GenerateCode(taskId);
                    sendTaskUpdate(taskId, "progress", "Starting AI Assistants...");
                    await codeGenerator.runWorkflow(selectedModel, description, filesToUse);

                    // send final response
                    sendTaskUpdate(taskId, "final", "Code generation completed.");
                } catch (error: any) {
                    console.error("Error within generate code stream:", error);
                    // send final response
                    sendTaskUpdate(taskId, "error", `Code generation failed. ${error.message}`);
                } finally {
                    // close the stream
                    controller.close();
                    clients.delete(taskId);
                }
            },
            cancel() {
                clients.delete(taskId);
            },
        });

        return new NextResponse(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            },
        });
    } catch (e) {
        console.log(e);
        return new Response(JSON.stringify({ error: (e as any).message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}

export function sendTaskUpdate(taskId: string, type: string, message: any) {
    const controller = clients.get(taskId);
    if (controller) {
        try {
            controller.enqueue(`data: ${JSON.stringify({ type, taskId, message })}\n\n`);
        } catch (error) {
            console.error("Error sending SSE update:", error);
            controller.error(new Error("Failed to send update"));
            clients.delete(taskId);
        }
    }
}
