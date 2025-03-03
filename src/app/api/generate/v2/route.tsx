import { NextResponse } from "next/server";

import { GenerateCodeV2 } from "@/modules/ai/GenerateCodeV2";
import { PrepareCodebase } from "@/modules/ai/PrepareCodebase";
import {
    getTaskStatus,
    getTaskMessages,
    createTaskSubscription,
    TaskStatus,
    setTaskStatus,
    completeTask,
    getTaskData,
    storeTaskData,
    deleteClient,
    sendTaskUpdate,
    setClient,
} from "@/modules/redis/RedisTaskManager";

export async function POST(req: Request) {
    try {
        const {
            taskId,
            owner,
            repo,
            branch,
            description,
            selectedModel,
            resume = false,
        } = await req.json();
        if (!taskId) {
            return NextResponse.json({ error: "Task Id is required" }, { status: 400 });
        }

        // Check if this is a resumed/continued task
        if (resume) {
            // For resumed tasks, we just need to check if the task exists at all
            const status = await getTaskStatus(taskId);
            if (!status) {
                return NextResponse.json({ error: "Task not found" }, { status: 404 });
            }

            // Update task data with any new values provided
            // This ensures we always have the latest values stored
            const currentTaskData: any = (await getTaskData(taskId)) || {
                id: taskId,
                startedAt: Date.now(),
            };

            await storeTaskData(taskId, {
                ...currentTaskData,
                owner: owner || currentTaskData.owner,
                repo: repo || currentTaskData.repo,
                branch: branch || currentTaskData.branch,
                description: description || currentTaskData.description,
                model: selectedModel || currentTaskData.model,
            });
        }

        const prepareCodebase = new PrepareCodebase();

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    setClient(taskId, controller);
                    req.signal.addEventListener("abort", () => deleteClient(taskId));

                    // If resuming, send all previous messages first
                    if (resume) {
                        const previousMessages = await getTaskMessages(taskId);
                        for (const msgData of previousMessages) {
                            controller.enqueue(`data: ${JSON.stringify(msgData)}\n\n`);
                        }
                    }

                    // If resuming, we may need to restore values from Redis
                    if (resume) {
                        // Get task data from Redis
                        const taskData = await getTaskData(taskId);

                        if (taskData) {
                            // Create the request using stored values, overridden by any provided values
                            const taskRequest: CodingTaskRequest = {
                                taskId,
                                owner: owner || taskData.owner || "",
                                repo: repo || taskData.repo || "",
                                branch: branch || taskData.branch || "",
                                task: description || taskData.description || "",
                                model: selectedModel || taskData.model || "",
                                files: [],
                                params: {},
                            };

                            // Create subscription to receive new messages from other instances
                            const sub = createTaskSubscription(taskId, controller);

                            // Handle cleanup when stream closes
                            req.signal.addEventListener("abort", () => {
                                sub.unsubscribe();
                                sub.quit();
                            });
                        }

                        // Now check task status and handle accordingly
                        const taskStatus = await getTaskStatus(taskId);
                        if (
                            taskStatus === TaskStatus.PENDING ||
                            taskStatus === TaskStatus.IN_PROGRESS
                        ) {
                            // For active tasks, continue existing workflow - no special handling needed
                        } else {
                            // For completed tasks, add a special message at the end
                            if (taskStatus === TaskStatus.COMPLETED) {
                                controller.enqueue(
                                    `data: ${JSON.stringify({
                                        type: "info",
                                        taskId,
                                        message:
                                            "This task has been completed. View the results above or start a new task.",
                                    })}\n\n`
                                );
                            } else if (taskStatus === TaskStatus.ERROR) {
                                controller.enqueue(
                                    `data: ${JSON.stringify({
                                        type: "error",
                                        taskId,
                                        message:
                                            "This task encountered an error. View the details above or start a new task.",
                                    })}\n\n`
                                );
                            }
                        }

                        return; // Just stream existing messages for resumed tasks
                    }

                    // Set task status to in progress
                    await setTaskStatus(taskId, TaskStatus.IN_PROGRESS);

                    // Store task metadata
                    await storeTaskData(taskId, {
                        id: taskId,
                        startedAt: Date.now(),
                        description,
                        repo,
                        branch,
                        owner,
                        model: selectedModel,
                    });

                    const taskRequest: CodingTaskRequest = {
                        taskId,
                        owner,
                        repo,
                        branch,
                        task: description,
                        model: selectedModel,
                        files: [],
                        params: {},
                    };

                    // Create subscription to receive messages from other instances
                    const sub = createTaskSubscription(taskId, controller);

                    // Handle cleanup when stream closes
                    req.signal.addEventListener("abort", () => {
                        sub.unsubscribe();
                        sub.quit();
                    });

                    // prepare codebase
                    const filesToUse = await prepareCodebase.prepare(taskRequest);
                    taskRequest.files = filesToUse;

                    sendTaskUpdate(taskId, "progress", "Starting AI Assistants...");

                    // run the assistants to generate code
                    const codeGenerator = new GenerateCodeV2();
                    await codeGenerator.runWorkflow(taskRequest);

                    // send final response
                    sendTaskUpdate(taskId, "final", "Code generation completed.");

                    // Update task status and completion time
                    await completeTask(taskId);
                } catch (error: any) {
                    console.error("Error within generate code stream:", error);
                    sendTaskUpdate(taskId, "error", `Code generation failed. ${error.message}`);
                    await setTaskStatus(taskId, TaskStatus.ERROR);
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
        console.log(e);
        return new Response(JSON.stringify({ error: (e as any).message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}

// Add a GET endpoint to check the status of a task and return task data
export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const taskId = url.searchParams.get("taskId");

        if (!taskId) {
            return NextResponse.json({ error: "Task Id is required" }, { status: 400 });
        }

        const status = await getTaskStatus(taskId);

        if (!status) {
            return NextResponse.json({ error: "Task not found" }, { status: 404 });
        }

        // Get additional task metadata if available
        const taskData = await getTaskData(taskId);

        return NextResponse.json({
            taskId,
            status,
            description: taskData?.description,
            repo: taskData?.repo,
            branch: taskData?.branch,
            startedAt: taskData?.startedAt,
            completedAt: taskData?.completedAt,
            model: taskData?.model,
        });
    } catch (e) {
        console.log(e);
        return NextResponse.json({ error: (e as any).message }, { status: 500 });
    }
}
