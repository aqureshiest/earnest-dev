import { v4 as uuidv4 } from "uuid";
import { NextResponse } from "next/server";
import { setClient, deleteClient, sendTaskUpdate } from "@/modules/utils/sendTaskUpdate";
import { GenerateIntegrationTestSpecs } from "@/modules/ai/GenerateIntegrationTestSpecs";

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

                    const prdContent = formData.get("prdContent") as string;

                    // Get integration map file
                    const integrationMapFile = formData.get("file_integration-map") as File;
                    if (!integrationMapFile) {
                        throw new Error("Integration map file is required");
                    }

                    // Validate file size
                    const maxSizeInBytes = 25 * 1024 * 1024;
                    if (integrationMapFile.size > maxSizeInBytes) {
                        throw new Error("Integration map file size exceeds the 25MB limit");
                    }

                    // Validate file type (only accept png and pdf)
                    const validTypes = ["image/png", "application/pdf"];
                    if (!validTypes.includes(integrationMapFile.type)) {
                        throw new Error("Invalid file type. Only PNG and PDF files are accepted");
                    }

                    const integrationMapBuffer = Buffer.from(
                        await integrationMapFile.arrayBuffer()
                    );

                    const generator = new GenerateIntegrationTestSpecs();

                    // Generate clarifying questions
                    const result = await generator.processIntegrationMap({
                        taskId,
                        task: "Generate clarifying questions",
                        model,
                        projectName: input.projectName,
                        projectDescription: input.projectDescription,
                        prdContent,
                        integrationMap: {
                            id: uuidv4(),
                            imageBuffer: integrationMapBuffer,
                        },
                        params: {
                            // set media type based on extension
                            media_type: integrationMapFile.type,
                        },
                    });

                    // Send the generated questions
                    sendTaskUpdate(taskId, "complete", {
                        questions: result.questions,
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
