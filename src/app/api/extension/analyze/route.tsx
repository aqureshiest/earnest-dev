import { NextResponse } from "next/server";
import { setClient, deleteClient, sendTaskUpdate } from "@/modules/utils/sendTaskUpdate";
import { ExtensionExecutor } from "@/modules/ai/extensions/ExtensionExecutor";
import { ExtensionDataStore } from "@/modules/ai/extensions/ExtensionDataStore";

export async function POST(req: Request) {
    try {
        const { taskId, extensionId, owner, repo, branch, selectedModel, params } =
            await req.json();

        if (!taskId || !extensionId) {
            return NextResponse.json(
                { error: "Task Id and Extension Id are required" },
                { status: 400 }
            );
        }

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    setClient(taskId, controller);
                    req.signal.addEventListener("abort", () => deleteClient(taskId));

                    const dataStore = new ExtensionDataStore();
                    const extensionConfig = await dataStore.loadExtensionConfig(extensionId);

                    const request = {
                        taskId,
                        extensionId,
                        owner,
                        repo,
                        branch,
                        model: selectedModel,
                        params: {
                            ...params,
                            extensionConfig,
                        },
                    };

                    sendTaskUpdate(taskId, "progress", "Starting analysis...");

                    const executor = new ExtensionExecutor();
                    await executor.execute(request);

                    sendTaskUpdate(taskId, "final", "Analysis completed.");
                } catch (error: any) {
                    console.error("Error within extension executor:", error);
                    sendTaskUpdate(taskId, "error", `Analysis failed: ${error.message}`);
                } finally {
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
        console.error(e);
        return NextResponse.json({ error: (e as any).message }, { status: 500 });
    }
}
