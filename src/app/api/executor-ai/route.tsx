import { ExecutorFactory } from "@/modules/ai/executor/ExecutorFactory";
import { LLM_MODELS } from "@/modules/utils/llmInfo";
import { ExecutorEvent } from "@/types/executor";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

// Get singleton instance of executor service with default tools
const executorService = ExecutorFactory.getExecutorService();

// Function to send SSE events
const sendSSE = (controller: ReadableStreamDefaultController<Uint8Array>, event: ExecutorEvent) => {
    const data = JSON.stringify(event);
    const message = `data: ${data}\n\n`;
    controller.enqueue(new TextEncoder().encode(message));
};

export async function POST(req: Request) {
    try {
        const { message, conversationId = uuidv4() } = await req.json();

        const model = LLM_MODELS.ANTHROPIC_CLAUDE_3_7_SONNET.id; // Default model for Executor

        // Validate request
        if (!message) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        // Create a stream for SSE
        const stream = new ReadableStream({
            async start(controller) {
                // Set up event handler
                const onEvent = (event: ExecutorEvent) => {
                    sendSSE(controller, event);
                };

                try {
                    // Process the request
                    await executorService.processRequest(
                        {
                            conversationId,
                            message,
                            model,
                        },
                        onEvent
                    );
                } catch (error) {
                    console.error("Error processing request:", error);
                    sendSSE(controller, {
                        type: "error",
                        message: `An error occurred: ${
                            error instanceof Error ? error.message : String(error)
                        }`,
                    });
                } finally {
                    // Close the stream
                    controller.close();
                }
            },
        });

        // Return the stream as SSE
        return new NextResponse(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            },
        });
    } catch (error) {
        console.error("Error in chat route:", error);
        return NextResponse.json(
            {
                error: `Error in chat route: ${
                    error instanceof Error ? error.message : String(error)
                }`,
            },
            { status: 500 }
        );
    }
}
