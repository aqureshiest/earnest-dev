import { NextResponse } from "next/server";
import { setClient, deleteClient, sendTaskUpdate } from "@/modules/utils/sendTaskUpdate";
import { GeneateJiraTickets } from "@/modules/ai/GenerateJiraTickets";

export async function POST(req: Request) {
    try {
        const { taskId, owner, repo, branch, selectedModel, tddProcessed } = await req.json();
        if (!taskId) {
            return NextResponse.json({ error: "Task Id is required" }, { status: 400 });
        }

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    setClient(taskId, controller);
                    req.signal.addEventListener("abort", () => deleteClient(taskId));

                    const request: JiraTicketsRequest = {
                        taskId,
                        task: "generate the jira tickets",
                        owner,
                        repo,
                        branch,
                        model: selectedModel,
                        tddProcessed,
                        files: [],
                        params: {},
                    };

                    sendTaskUpdate(taskId, "progress", "Starting Jira tickets generation...");

                    const generateTickets = new GeneateJiraTickets();
                    await generateTickets.runWorkflow(request);

                    sendTaskUpdate(taskId, "final", "All done.");
                } catch (error: any) {
                    console.error("Error within generate jira tickets stream:", error);
                    // send final response
                    sendTaskUpdate(
                        taskId,
                        "error",
                        `Jira tickets generation failed. ${error.message}`
                    );
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
