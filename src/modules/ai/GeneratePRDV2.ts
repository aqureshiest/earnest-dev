import { FeatureQuestions, FigmaScreen, FigmaScreenAnalysis, PRDTaskRequest } from "@/types/prd";
import { sendTaskUpdate } from "../utils/sendTaskUpdate";
import { FeatureQuestionsAssistant } from "./prd/FeatureQuestionsAssistant";
import { FigmaProcessorAssistant } from "./prd/FigmaProcessorAssistant";
import { PRDAssistantFeatureFlow } from "./prd/PRDAssistantFeatureFlow";
import { PRDAssistantMainSection } from "./prd/PRDAssistantMainSection";
import { displayTime } from "../utils/displayTime";
import { PRDMetricsService } from "../metrics/generate/PRDMetricsService";

export class GeneratePRDV2 {
    private featureQuestionsAssistant: FeatureQuestionsAssistant;
    private figmaProcessorAssistant: FigmaProcessorAssistant;
    private featureFlowAssistant: PRDAssistantFeatureFlow;
    private mainSectionAssistant: PRDAssistantMainSection;

    constructor() {
        this.featureQuestionsAssistant = new FeatureQuestionsAssistant();
        this.figmaProcessorAssistant = new FigmaProcessorAssistant();
        this.featureFlowAssistant = new PRDAssistantFeatureFlow();
        this.mainSectionAssistant = new PRDAssistantMainSection();
    }

    async generateQuestions(request: PRDTaskRequest): Promise<FeatureQuestions[]> {
        const { taskId, input, model } = request;

        let inputTokens = 0;
        let outputTokens = 0;
        let calculatedTokens = 0;
        let cost = 0;

        try {
            sendTaskUpdate(taskId, "progress", "Generating follow-up questions...");

            const featureQuestions: FeatureQuestions[] = [];

            // go through each feature to generate questions
            for (const feature of input.keyFeatures) {
                const questions = await this.featureQuestionsAssistant.process({
                    taskId,
                    model,
                    task: `Generate questions for feature: ${feature.name}`,
                    params: { feature },
                    input,
                });

                if (!questions || !questions.response) {
                    throw new Error("Questions not generated.");
                }

                inputTokens += questions.inputTokens;
                outputTokens += questions.outputTokens;
                calculatedTokens += questions.calculatedTokens;
                cost += questions.cost;

                // add questions to the feature questions list
                featureQuestions.push({
                    featureId: feature.id,
                    featureName: feature.name,
                    questions: questions.response,
                });
            }

            //  TODO emit metrics (with doc upload its not correct)
            // await this.emitMetrics(taskId, { calculatedTokens, inputTokens, outputTokens, cost });

            return featureQuestions;
        } catch (error: any) {
            console.error("Error generating questions:", error);
            throw new Error(`Failed to generate questions: ${error.message}`);
        }
    }

    async generatePRD(request: PRDTaskRequest) {
        const { taskId, input, model } = request;

        let inputTokens = 0;
        let outputTokens = 0;
        let calculatedTokens = 0;
        let cost = 0;
        const startTime = new Date().getTime();

        const metricsService = new PRDMetricsService();

        // 1. process feature and their screens
        const featureFlows: string[] = [];
        for (const feature of input.keyFeatures) {
            try {
                // Process figma screens if available
                let screenAnalyses: FigmaScreenAnalysis[] = [];
                const figmaScreens = feature.figmaScreens as FigmaScreen[];
                if (figmaScreens?.length > 0) {
                    sendTaskUpdate(taskId, "progress", `Analyzing screens for ${feature.name}`);

                    screenAnalyses = await Promise.all(
                        figmaScreens.map(async (screen) => {
                            const analysis = await this.figmaProcessorAssistant.process({
                                taskId,
                                model,
                                task: `Analyze screen: ${screen.name}`,
                                params: {
                                    feature,
                                    screen,
                                    media_type: screen.name.endsWith("png")
                                        ? "image/png"
                                        : screen.name.endsWith("pdf")
                                        ? "application/pdf"
                                        : undefined,
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
                                screenId: screen.id,
                                screenName: screen.name,
                                analysis: analysis.response,
                            };
                        })
                    );

                    sendTaskUpdate(taskId, "feature_screens_analysis", {
                        featureId: feature.id,
                        featureName: feature.name,
                        analysis: screenAnalyses
                            .map(
                                (screen) =>
                                    `## Screen: ${screen.screenName}\nAnalysis: ${screen.analysis}`
                            )
                            .join("\n\n"),
                    });
                }

                // 2. generate feature documentation
                sendTaskUpdate(taskId, "progress", `Generating requirements for ${feature.name}`);
                const featureFlow = await this.featureFlowAssistant.process({
                    taskId,
                    model,
                    task: `Generate feature flow for: ${feature.name}`,
                    params: {
                        feature,
                        screenAnalyses,
                        finalOutputPrompt: request.params.finalOutputPrompt || "",
                    },
                    input,
                });

                if (!featureFlow || !featureFlow.response) {
                    throw new Error("Error generating feature flow.");
                }

                inputTokens += featureFlow.inputTokens;
                outputTokens += featureFlow.outputTokens;
                calculatedTokens += featureFlow.calculatedTokens;
                cost += featureFlow.cost;

                featureFlows.push(featureFlow.response);
            } catch (error: any) {
                sendTaskUpdate(taskId, "error", error.message);
                throw error;
            }
        }

        // 3. generate main PRD sections
        sendTaskUpdate(taskId, "progress", "Finalizing PRD");
        const mainSections = await this.mainSectionAssistant.process({
            taskId,
            model,
            task: "Generate main PRD sections",
            input,
            params: {},
        });

        if (!mainSections || !mainSections.response) {
            throw new Error("Error generating main PRD sections.");
        }

        inputTokens += mainSections.inputTokens;
        outputTokens += mainSections.outputTokens;
        calculatedTokens += mainSections.calculatedTokens;
        cost += mainSections.cost;

        // 4. combine all content
        const completePRD = this.combinePRDContent(mainSections.response, featureFlows);

        // TODO emit metrics - handle doc upload
        // await this.emitMetrics(taskId, { calculatedTokens, inputTokens, outputTokens, cost });

        // report time taken
        const endTime = new Date().getTime();
        sendTaskUpdate(taskId, "progress", `Time taken: ${displayTime(startTime, endTime)}`);

        // metrics
        await metricsService.trackStats({
            featureCount: input.keyFeatures.length,
            screenCount: input.keyFeatures.reduce(
                (acc, feature) => acc + (feature.figmaScreens?.length || 0),
                0
            ),
            wordCount: completePRD.split(" ").length,
            inputTokens,
            outputTokens,
            cost,
        });
        await metricsService.trackDuration(endTime - startTime);

        return completePRD;
    }

    private combinePRDContent(mainContent: string, featureFlows: string[]): string {
        return `${mainContent}\n\n# User Flow and Use Cases\n\n${featureFlows.join("\n\n")}`;
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
