import PullRequestService from "@/modules/github/PullRequestService";
import { GeneratePR } from "@/modules/ai/GeneratePR";
import { NextResponse } from "next/server";
import { setClient, deleteClient, sendTaskUpdate } from "@/modules/utils/sendTaskUpdate";

export async function POST(req: Request) {
    try {
        const { taskId, owner, repo, branch, description, selectedModel, params, prTitle } =
            await req.json();
        if (!taskId) {
            return NextResponse.json({ error: "Task Id is required" }, { status: 400 });
        }

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    setClient(taskId, controller);
                    req.signal.addEventListener("abort", () => deleteClient(taskId));

                    const { implementationPlan, generatedCode } = params;

                    const taskRequest: CodingTaskRequest = {
                        taskId,
                        owner,
                        repo,
                        branch,
                        task: description,
                        model: selectedModel,
                        files: [],
                        params: {
                            implementationPlan: implementationPlan.responseStr,
                            generatedCode: generatedCode.responseStr,
                        },
                    };

                    sendTaskUpdate(taskId, "progress", "Starting pull request...");

                    // call the assistant to generate PR
                    const prGenerator = new GeneratePR();
                    const response = await prGenerator.runWorkflow(taskRequest);

                    sendTaskUpdate(taskId, "progress", "Finalizing pull request...");

                    // generate PR
                    const prService = new PullRequestService(owner, repo, branch);
                    let prLink;
                    try {
                        prLink = await prService.createPullRequest(
                            generatedCode.response,
                            response.response?.title || prTitle,
                            response.response?.body || description
                        );
                        
                        sendTaskUpdate(taskId, "progress", "Pull request created with AI-Generated label.");
                    } catch (error: any) {
                        // Check if the error is specifically about label addition
                        if (error.message && error.message.includes("label") && error.prLink) {
                            // If we have a PR link but label addition failed, we can still return the PR link
                            prLink = error.prLink;
                            sendTaskUpdate(taskId, "progress", "Pull request created, but adding AI-Generated label failed.");
                            console.warn(`Label addition failed for PR in ${owner}/${repo}, but PR was created: ${error.message}`);
                        } else {
                            // If it's a different error, rethrow it
                            throw error;
                        }
                    }

                    sendTaskUpdate(taskId, "progress", "Pull request creation completed.");
                    sendTaskUpdate(taskId, "final", { prLink });
                } catch (error: any) {
                    console.error("Error within generate pr stream:", error);
                    // send final response
                    sendTaskUpdate(taskId, "error", `PR generation failed. ${error.message}`);
                } finally {
                    // close the stream
                    controller.close();
                    deleteClient(taskId);
                }
            },
            cancel() {
                deleteClient(taskId);
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