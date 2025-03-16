import { sendTaskUpdate } from "../utils/sendTaskUpdate";
import { displayTime } from "../utils/displayTime";
import { v4 as uuidv4 } from "uuid";
import { IntegrationMapProcessor } from "./integration-tests/IntegrationMapProcessor";
import {
    IntegrationQuestionsGenerator,
    IntegrationQuestion,
} from "./integration-tests/IntegrationMapQuestionsAssistant";
import { TestSpecificationGenerator } from "./integration-tests/TestSpecificationGenerator";
import { FigmaProcessorAssistant } from "./prd/FigmaProcessorAssistant";

export interface FigmaScreen {
    id: string;
    name: string;
    imageBuffer: Buffer;
    description?: string;
}

export interface IntegrationTestRequest extends TaskRequest {
    projectName: string;
    projectDescription: string;
    prdContent?: string;
    integrationMap?: {
        id: string;
        imageBuffer: Buffer;
    };
    integrationMapAnalysis?: string;
    figmaScreens?: FigmaScreen[];
    figmaScreensAnalysis?: string;
}

export class GenerateIntegrationTestSpecs {
    private figmaProcessor: FigmaProcessorAssistant;
    private integrationMapProcessor: IntegrationMapProcessor;
    private questionsGenerator: IntegrationQuestionsGenerator;
    private specificationGenerator: TestSpecificationGenerator;

    constructor() {
        this.figmaProcessor = new FigmaProcessorAssistant();
        this.integrationMapProcessor = new IntegrationMapProcessor();
        this.questionsGenerator = new IntegrationQuestionsGenerator();
        this.specificationGenerator = new TestSpecificationGenerator();
    }

    async processIntegrationMap(request: IntegrationTestRequest) {
        const { taskId, model, projectName, projectDescription, prdContent, integrationMap } =
            request;

        let inputTokens = 0;
        let outputTokens = 0;
        let calculatedTokens = 0;
        let cost = 0;

        try {
            if (!integrationMap) {
                throw new Error("Integration map is required for analysis");
            }

            sendTaskUpdate(taskId, "progress", "Analyzing integration map...");

            // Process the integration map
            const mapAnalysis = await this.integrationMapProcessor.process({
                taskId,
                model,
                task: "Analyze integration map",
                params: {
                    projectName,
                    projectDescription,
                    media_type: request.params?.media_type,
                },
                imageBuffer: integrationMap.imageBuffer,
            });

            if (!mapAnalysis || !mapAnalysis.response) {
                throw new Error("Failed to analyze integration map");
            }

            inputTokens += mapAnalysis.inputTokens;
            outputTokens += mapAnalysis.outputTokens;
            calculatedTokens += mapAnalysis.calculatedTokens;
            cost += mapAnalysis.cost;

            sendTaskUpdate(taskId, "integration_map_analysis", {
                analysis: mapAnalysis.response,
            });

            sendTaskUpdate(taskId, "progress", "Generating clarifying questions...");

            // Generate questions based on the map analysis
            const questions = await this.questionsGenerator.process({
                taskId,
                model,
                task: "Generate integration questions",
                params: {
                    integrationMapAnalysis: mapAnalysis.response,
                    prdContent,
                    projectName,
                    projectDescription,
                    stage: "map",
                },
            });

            if (!questions || !questions.response) {
                throw new Error("Failed to generate questions");
            }

            inputTokens += questions.inputTokens;
            outputTokens += questions.outputTokens;
            calculatedTokens += questions.calculatedTokens;
            cost += questions.cost;

            // TODO emit metrics
            // await this.emitMetrics(taskId, { calculatedTokens, inputTokens, outputTokens, cost });

            return {
                integrationMapAnalysis: mapAnalysis.response,
                questions: questions.response,
            };
        } catch (error: any) {
            console.error("Error processing integration map:", error);
            sendTaskUpdate(taskId, "error", error.message);
            throw error;
        }
    }

    async generateTestSpecification(
        request: IntegrationTestRequest,
        questions: IntegrationQuestion[]
    ) {
        const {
            taskId,
            model,
            projectName,
            projectDescription,
            prdContent,
            integrationMapAnalysis,
            figmaScreens,
        } = request;

        let inputTokens = 0;
        let outputTokens = 0;
        let calculatedTokens = 0;
        let cost = 0;
        const startTime = new Date().getTime();

        try {
            // Process Figma screens if available
            let figmaScreensAnalysis = "";
            if (figmaScreens?.length) {
                sendTaskUpdate(taskId, "progress", "Analyzing UI flows...");

                const screenAnalyses = await Promise.all(
                    figmaScreens.map(async (screen) => {
                        const analysis = await this.figmaProcessor.process({
                            taskId,
                            model,
                            task: `Analyze screen: ${screen.name}`,
                            params: {
                                feature: {
                                    id: uuidv4(),
                                    name: projectName,
                                    description: projectDescription,
                                    priority: "high",
                                },
                                screen,
                                media_type: screen.name.endsWith(".png")
                                    ? "image/png"
                                    : screen.name.endsWith(".pdf")
                                    ? "application/pdf"
                                    : "",
                            },
                            imageBuffer: screen.imageBuffer,
                        });

                        if (!analysis || !analysis.response) {
                            throw new Error("Error analyzing screen.");
                        }

                        inputTokens += analysis.inputTokens;
                        outputTokens += analysis.outputTokens;
                        calculatedTokens += analysis.calculatedTokens;
                        cost += analysis.cost;

                        return {
                            screenName: screen.name,
                            analysis: analysis.response,
                        };
                    })
                );

                // Combine screen analyses into a single markdown document
                figmaScreensAnalysis = screenAnalyses
                    .map((screen) => `## Screen: ${screen.screenName}\n${screen.analysis}`)
                    .join("\n\n");

                sendTaskUpdate(taskId, "figma_screens_analysis", {
                    analysis: figmaScreensAnalysis,
                });
            }

            // Generate the test specification
            sendTaskUpdate(taskId, "progress", "Creating test specification document...");

            const spec = await this.specificationGenerator.process({
                taskId,
                model,
                task: "Generate test specification",
                params: {
                    projectName,
                    projectDescription,
                    prdContent,
                    integrationMapAnalysis: integrationMapAnalysis || "",
                    figmaScreensAnalysis,
                    questions,
                    finalOutputPrompt: request.params.finalOutputPrompt || "",
                },
            });

            if (!spec || !spec.response) {
                throw new Error("Failed to generate test specification");
            }

            inputTokens += spec.inputTokens;
            outputTokens += spec.outputTokens;
            calculatedTokens += spec.calculatedTokens;
            cost += spec.cost;

            // Send the completed specification
            sendTaskUpdate(taskId, "complete", {
                content: spec.response,
            });

            // TODO emit metrics  handle with doc upload
            // await this.emitMetrics(taskId, { calculatedTokens, inputTokens, outputTokens, cost });

            // report time taken
            const endTime = new Date().getTime();
            sendTaskUpdate(taskId, "progress", `Time taken: ${displayTime(startTime, endTime)}`);

            return spec.response;
        } catch (error: any) {
            console.error("Error generating test specification:", error);
            sendTaskUpdate(taskId, "error", error.message);
            throw error;
        }
    }

    private async emitMetrics(taskId: string, result: Partial<AIAssistantResponse<any>>) {
        sendTaskUpdate(taskId, "progress", "Token usage and cost metrics:");
        sendTaskUpdate(
            taskId,
            "progress",
            `- Approximated tokens: ${result.calculatedTokens?.toFixed(0) || "N/A"}`
        );
        sendTaskUpdate(taskId, "progress", `- Actual Input tokens: ${result.inputTokens}`);
        sendTaskUpdate(taskId, "progress", `- Actual Output tokens: ${result.outputTokens}`);
        sendTaskUpdate(taskId, "progress", `- Cost: $${result.cost?.toFixed(6) || "N/A"}`);
    }
}
