import { NextResponse } from "next/server";
import { setClient, deleteClient, sendTaskUpdate } from "@/modules/utils/sendTaskUpdate";
import { PRDInput } from "@/types/prd";
import { GeneratePRD } from "@/modules/prd/GeneratePRD";
import { v4 as uuidv4 } from "uuid";
import { GeneratePRDV2 } from "@/modules/prd/GeneratePRDV2";
import { PRDMetricsService } from "@/modules/metrics/generate/PRDMetricsService";
import { reportError } from "@/modules/bugsnag/report";

export async function POST(req: Request) {
    const metricsService = new PRDMetricsService();

    try {
        const formData = await req.formData();
        const body = Object.fromEntries(formData);
        const taskId = Date.now().toString();

        // Parse the input, model and custom prompt from formData
        const input = JSON.parse(body.input as string) as PRDInput;
        const model = body.model as string;
        const customPromptSys = (body.customPromptSys as string) || "";
        const customPromptUser = (body.customPromptUser as string) || "";

        if (!input || !model) {
            return NextResponse.json({ error: "Input and model are required" }, { status: 400 });
        }

        // Process file uploads
        const filePromises = Object.entries(body)
            .filter(([key]) => key.startsWith("file_"))
            .map(async ([key, file]) => {
                const [, featureId] = key.split("_");
                const blob = file as Blob;
                const buffer = Buffer.from(await blob.arrayBuffer());
                return {
                    featureId,
                    screen: {
                        id: uuidv4(),
                        name: (file as File).name,
                        imageBuffer: buffer,
                    },
                };
            });
        const processedFiles = await Promise.all(filePromises);

        // Group files by feature ID
        const filesByFeature = processedFiles.reduce((acc, { featureId, screen }) => {
            if (!acc[featureId]) {
                acc[featureId] = [];
            }
            acc[featureId].push(screen);
            return acc;
        }, {} as Record<string, any[]>);

        // Attach screens to features in the input
        input.keyFeatures = input.keyFeatures.map((feature: any) => ({
            ...feature,
            figmaScreens: filesByFeature[feature.id] || [],
        }));

        await metricsService.trackRequest();

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    // Set up the streaming client
                    setClient(taskId, controller);
                    req.signal.addEventListener("abort", () => deleteClient(taskId));

                    // Initialize the PRD generator with the custom prompt (if any)
                    // const prdGenerator = new GeneratePRD(
                    //     model,
                    //     taskId,
                    //     customPromptSys,
                    //     customPromptUser
                    // );
                    const prdGenerator = new GeneratePRDV2();

                    // Generate the PRD with feature responses
                    // const prdContent = await prdGenerator.generatePRD(input as PRDInput);
                    const prdContent = await prdGenerator.generatePRD({
                        taskId,
                        task: "generate prd",
                        model,
                        input,
                        overrides: {
                            featurePrompt: customPromptUser,
                        },
                    });

                    // Send the generated PRD content
                    sendTaskUpdate(taskId, "complete", {
                        content: prdContent,
                        timestamp: new Date().toISOString(),
                    });

                    // Final completion message
                    sendTaskUpdate(taskId, "final", "PRD generation completed successfully.");
                    await metricsService.trackSuccess(true);
                } catch (error: any) {
                    console.error("Error in PRD generation:", error);
                    sendTaskUpdate(taskId, "error", `PRD generation failed: ${error.message}`);

                    // Metrics tracking
                    await metricsService.trackSuccess(false);

                    // Bugsnag error reporting
                    reportError(error as Error, {
                        endpoint: "pr",
                        context: "Creating pull request",
                    });
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

        // Metrics tracking
        await metricsService.trackSuccess(false);

        // Bugsnag error reporting
        reportError(error as Error, {
            endpoint: "pr",
            context: "Creating pull request",
        });

        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
