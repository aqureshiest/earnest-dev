import { GenerateCode } from "@/modules/ai/GenerateCode";
import { NextResponse } from "next/server";
import { PrepareCodebase } from "@/modules/ai/PrepareCodebase";
import { setClient, deleteClient, sendTaskUpdate } from "@/modules/utils/sendTaskUpdate";

export async function POST(req: Request) {
    try {
        const { taskId, owner, repo, branch, description, selectedModel } = await req.json();
        if (!taskId) {
            return NextResponse.json({ error: "Task Id is required" }, { status: 400 });
        }

        const prepareCodebase = new PrepareCodebase();

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    setClient(taskId, controller);
                    req.signal.addEventListener("abort", () => deleteClient(taskId));

                    // prepare codebase
                    const filesToUse = await prepareCodebase.prepare(
                        owner,
                        repo,
                        branch,
                        description,
                        taskId
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
