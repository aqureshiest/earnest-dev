import { NextResponse } from "next/server";
import { setClient, deleteClient, sendTaskUpdate } from "@/modules/utils/sendTaskUpdate";
import { GenerateCodeV2 } from "@/modules/ai/GenerateCodeV2";
import { PrepareCodebase } from "@/modules/ai/PrepareCodebase";
import { CodeGenMetricsService } from "@/modules/metrics/generate/CodeGenMetricsService";
import { reportError } from "@/modules/bugsnag/report";

export async function POST(req: Request) {
    const { taskId, owner, repo, branch, description, selectedModel, maximizeTokenUsage } =
        await req.json();
    if (!taskId) {
        return NextResponse.json({ error: "Task Id is required" }, { status: 400 });
    }

    const metricsService = new CodeGenMetricsService();

    try {
        await metricsService.trackRequest({ owner, repo });

        const prepareCodebase = new PrepareCodebase();

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    setClient(taskId, controller);
                    req.signal.addEventListener("abort", () => deleteClient(taskId));

                    const taskRequest: CodingTaskRequest = {
                        taskId,
                        owner,
                        repo,
                        branch,
                        task: description,
                        model: selectedModel,
                        files: [],
                        params: { maximizeTokenUsage },
                    };

                    // prepare codebase
                    const filesToUse = await prepareCodebase.prepare(taskRequest);
                    taskRequest.files = filesToUse;

                    sendTaskUpdate(taskId, "progress", "Starting AI Assistants...");

                    // run the assistants to generate code
                    const codeGenerator = new GenerateCodeV2();
                    await codeGenerator.runWorkflow(taskRequest);

                    // send final response
                    sendTaskUpdate(taskId, "final", "Code generation completed.");
                    await metricsService.trackSuccess({ owner, repo }, true);
                } catch (error: any) {
                    sendTaskUpdate(taskId, "error", `Code generation failed. ${error.message}`);

                    // metrics tracking
                    await metricsService.trackSuccess({ owner, repo }, false);

                    // bugsnag error reporting
                    reportError(error as Error, {
                        request: {
                            taskId,
                            owner,
                            repo,
                            branch,
                            model: selectedModel,
                        },
                    });
                } finally {
                    // close the stream
                    deleteClient(taskId);
                    controller.close();
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
        // metrics tracking
        await metricsService.trackSuccess({ owner, repo }, false);

        // bugsnag error reporting
        reportError(e as Error, {
            request: {
                taskId,
                owner,
                repo,
                branch,
                model: selectedModel,
            },
        });

        return new Response(JSON.stringify({ error: (e as any).message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
