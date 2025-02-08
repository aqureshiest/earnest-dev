import { NextResponse } from "next/server";
import { setClient, deleteClient, sendTaskUpdate } from "@/modules/utils/sendTaskUpdate";
import { PRDInput } from "@/types/prd";
import { GeneratePRD } from "@/modules/prd/GeneratePRD";

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const body = Object.fromEntries(formData);
        const taskId = Date.now().toString();

        // Parse the input and model from formData
        const input = JSON.parse(body.input as string);
        const model = body.model as string;

        if (!input || !model) {
            return NextResponse.json({ error: "Input and model are required" }, { status: 400 });
        }

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    // Set up the streaming client
                    setClient(taskId, controller);
                    req.signal.addEventListener("abort", () => deleteClient(taskId));

                    // Initialize the PRD generator
                    const prdGenerator = new GeneratePRD(model, taskId);

                    sendTaskUpdate(taskId, "progress", "Generating follow-up questions...");

                    // Generate questions for each feature
                    const questions = await prdGenerator.generateQuestions(input as PRDInput);

                    // Send the generated questions
                    sendTaskUpdate(taskId, "complete", {
                        questions,
                        timestamp: new Date().toISOString(),
                    });

                    // Final completion message
                    sendTaskUpdate(taskId, "final", "Question generation completed successfully.");
                } catch (error: any) {
                    console.error("Error in question generation:", error);
                    sendTaskUpdate(taskId, "error", `Question generation failed: ${error.message}`);
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
    } catch (error: any) {
        console.error("Error in API route:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
