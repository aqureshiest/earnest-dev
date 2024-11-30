import { NextResponse } from "next/server";
import { setClient, deleteClient, sendTaskUpdate } from "@/modules/utils/sendTaskUpdate";
import { PerformCodeAnalysis } from "@/modules/ai/PerformCodeAnalysis";

export async function POST(req: Request) {
    try {
        const { taskId, owner, repo, branch, selectedModel, analysisTypes } = await req.json();
        if (!taskId) {
            return NextResponse.json({ error: "Task Id is required" }, { status: 400 });
        }

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    setClient(taskId, controller);
                    req.signal.addEventListener("abort", () => deleteClient(taskId));

                    const request: CodeAnalysisRequest = {
                        taskId,
                        task: "analyze code for design patterns",
                        owner,
                        repo,
                        branch,
                        model: selectedModel,
                        files: [],
                        params: {},
                        analysisTypes,
                    };

                    sendTaskUpdate(taskId, "progress", "Starting Code Analysis...");

                    const codeAnalysis = new PerformCodeAnalysis();
                    await codeAnalysis.runAnalysis(request);

                    sendTaskUpdate(taskId, "final", "All done.");
                } catch (error: any) {
                    console.error("Error within code analysis stream:", error);
                    // send final response
                    sendTaskUpdate(taskId, "error", `Code analysis failed. ${error.message}`);
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
