import { NextResponse } from "next/server";
import { setClient, deleteClient, sendTaskUpdate } from "@/modules/utils/sendTaskUpdate";
import { GeneratePRD } from "@/modules/prd/GeneratePRD";
import { PRDInput } from "@/types/prd";

export async function POST(req: Request) {
    try {
        const { input, model, taskId = Date.now().toString() } = await req.json();

        // Validate the request
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
                    const prdGenerator = new GeneratePRD(model);

                    // Process any uploaded Figma screens
                    if (input.figmaScreens && input.figmaScreens.length > 0) {
                        sendTaskUpdate(taskId, "progress", "Processing Figma screens...");
                        // Note: File processing would happen here in the full implementation
                    }

                    // Send update about starting PRD generation
                    sendTaskUpdate(taskId, "progress", "Starting PRD generation...");

                    // Generate the PRD
                    const prdContent = await prdGenerator.generatePRD(input as PRDInput);

                    // Send the generated PRD content
                    sendTaskUpdate(taskId, "complete", {
                        content: prdContent,
                        timestamp: new Date().toISOString(),
                    });

                    // Send final completion message
                    sendTaskUpdate(taskId, "final", "PRD generation completed successfully.");
                } catch (error: any) {
                    console.error("Error in PRD generation:", error);
                    sendTaskUpdate(taskId, "error", `PRD generation failed: ${error.message}`);
                } finally {
                    // Clean up
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
