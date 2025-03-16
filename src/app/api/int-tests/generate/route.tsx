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
        const finalOutputPrompt = (body.finalOutputPrompt as string) || "";

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
                    const integrationMapAnalysis = formData.get("integrationMapAnalysis") as string;

                    // Parse questions
                    const questionsJson = formData.get("questions") as string;
                    const questions = JSON.parse(questionsJson);

                    // Get figma screens if available
                    const figmaScreenFiles: File[] = [];
                    for (const [key, value] of Array.from(formData.entries())) {
                        if (key.startsWith("file_figma") && value instanceof File) {
                            figmaScreenFiles.push(value);
                        }
                    }

                    const figmaScreens = await Promise.all(
                        figmaScreenFiles.map(async (file) => {
                            const buffer = await file.arrayBuffer();
                            return {
                                id: uuidv4(),
                                name: file.name,
                                imageBuffer: Buffer.from(buffer),
                            };
                        })
                    );

                    console.log(finalOutputPrompt, "finalOutputPrompt");

                    const generator = new GenerateIntegrationTestSpecs();

                    const testSpec = await generator.generateTestSpecification(
                        {
                            taskId,
                            task: "Generate integration test specification",
                            model,
                            projectName: input.projectName,
                            projectDescription: input.projectDescription,
                            prdContent,
                            integrationMapAnalysis,
                            figmaScreens: figmaScreens.length > 0 ? figmaScreens : undefined,
                            params: {
                                finalOutputPrompt: finalOutputPrompt || "",
                            },
                        },
                        questions
                    );

                    // Send the generated questions
                    sendTaskUpdate(taskId, "complete", {
                        content: testSpec,
                        timestamp: new Date().toISOString(),
                    });

                    // Final completion message
                    sendTaskUpdate(
                        taskId,
                        "final",
                        "Integration test specification generation completed successfully."
                    );
                } catch (error: any) {
                    console.error("Error generating test specification:", error);
                    sendTaskUpdate(taskId, "error", error.message);
                    throw error;
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
