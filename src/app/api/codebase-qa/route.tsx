import { NextResponse } from "next/server";
import { setClient, deleteClient, sendTaskUpdate } from "@/modules/utils/sendTaskUpdate";
import { CodebaseQA } from "@/modules/ai/CodebaseQA";

export async function POST(req: Request) {
    const { taskId, owner, repo, branch, selectedModel, question, conversationHistory } =
        await req.json();

    if (!taskId) {
        return NextResponse.json({ error: "Task Id is required" }, { status: 400 });
    }

    try {
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    setClient(taskId, controller);
                    req.signal.addEventListener("abort", () => deleteClient(taskId));

                    // Create enhanced question with conversation history if provided
                    let questionWithHistory = question;

                    if (conversationHistory && conversationHistory.length > 0) {
                        // Include up to last 10 exchanges for context (1-2 Q&A pairs)
                        const relevantHistory = conversationHistory.slice(-10);

                        // Format the conversation history
                        const formattedHistory = relevantHistory
                            .map((msg: any, i: number) => {
                                const role = i % 2 === 0 ? "User" : "Assistant";
                                return `${role}: ${msg}`;
                            })
                            .join("\n\n");

                        // Add history to the question
                        questionWithHistory = `
Previous conversation:
${formattedHistory}

Current question: ${question}`;
                    }

                    const taskRequest: CodebaseQuestionRequest = {
                        taskId,
                        owner,
                        repo,
                        branch,
                        model: selectedModel,
                        task: questionWithHistory,
                        files: [],
                    };

                    // Use the orchestrator to run the workflow
                    const codebaseQA = new CodebaseQA();
                    const response = await codebaseQA.runWorkflow(taskRequest);

                    // Send the final answer
                    sendTaskUpdate(taskId, "answer", response.response);

                    // Send final status
                    sendTaskUpdate(taskId, "final", "Analysis completed.");
                } catch (error: any) {
                    console.error("Error within codebase question stream:", error);
                    sendTaskUpdate(taskId, "error", `Analysis failed. ${error.message}`);
                } finally {
                    // Close the stream
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
