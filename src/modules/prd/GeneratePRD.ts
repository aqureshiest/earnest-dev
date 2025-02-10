import { PRDInput, FigmaScreenAnalysis, FigmaScreen, FeatureQuestions } from "@/types/prd";
import { sendTaskUpdate } from "../utils/sendTaskUpdate";
import { FigmaProcessor } from "./FigmaProcessor";
import { defaultFeatureFlowPrompt, FeatureFlowPrompt } from "./featureFlowPrompt";
import { PRDAssistant } from "./PRDAssistant";
import { FeatureQuestionsService } from "./FeatureQuestionsService";

export class GeneratePRD {
    private prdAssistant: PRDAssistant;
    private figmaProcessor: FigmaProcessor;
    private questionService: FeatureQuestionsService;
    private taskId: string;

    private featureFlowPrompt: FeatureFlowPrompt = {
        system: defaultFeatureFlowPrompt.system,
        user: defaultFeatureFlowPrompt.user,
    };

    constructor(
        model: string,
        taskId: string,
        featureFlowPromptSystem?: string,
        featureFlowPromptUser?: string
    ) {
        if (featureFlowPromptSystem && featureFlowPromptUser) {
            this.featureFlowPrompt = {
                system: featureFlowPromptSystem,
                user: featureFlowPromptUser,
            };
        }

        this.prdAssistant = new PRDAssistant(model, this.featureFlowPrompt);
        this.figmaProcessor = new FigmaProcessor(model);
        this.questionService = new FeatureQuestionsService(model);
        this.taskId = taskId;
    }

    async generateQuestions(input: PRDInput): Promise<FeatureQuestions[]> {
        try {
            sendTaskUpdate(this.taskId, "progress", "Generating follow-up questions...");
            const questions = await this.questionService.generateQuestions(input);
            return questions;
        } catch (error: any) {
            console.error("Error generating questions:", error);
            throw new Error(`Failed to generate questions: ${error.message}`);
        }
    }

    async generatePRD(input: PRDInput): Promise<string> {
        try {
            sendTaskUpdate(this.taskId, "progress", "Starting PRD generation");

            // Process features and their screens
            const featureFlows: string[] = [];
            for (const feature of input.keyFeatures) {
                try {
                    // Process Figma screens if available
                    let screenAnalyses: FigmaScreenAnalysis[] = [];
                    const figmaScreens = feature.figmaScreens as FigmaScreen[];
                    if (figmaScreens?.length > 0) {
                        sendTaskUpdate(
                            this.taskId,
                            "progress",
                            `Analyzing screens for ${feature.name}`
                        );

                        screenAnalyses = await this.figmaProcessor.analyzeScreens(
                            figmaScreens,
                            feature
                        );
                        sendTaskUpdate(this.taskId, "feature_screens_analysis", {
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

                    // Generate feature documentation
                    sendTaskUpdate(
                        this.taskId,
                        "progress",
                        `Generating requirements for ${feature.name}`
                    );
                    const featureFlow = await this.prdAssistant.generateFeatureFlow(
                        feature,
                        input,
                        screenAnalyses
                    );
                    featureFlows.push(featureFlow);
                } catch (error: any) {
                    sendTaskUpdate(this.taskId, "error", error.message);
                    throw error;
                }
            }

            // Generate main PRD sections
            sendTaskUpdate(this.taskId, "progress", "Finalizing PRD");
            const mainPRDContent = await this.prdAssistant.generateMainSections(input);

            // Combine all content
            const completePRD = this.combinePRDContent(mainPRDContent, featureFlows);

            return completePRD;
        } catch (error: any) {
            sendTaskUpdate(this.taskId, "error", `Error: ${error.message}`);
            throw error;
        }
    }

    private combinePRDContent(mainContent: string, featureFlows: string[]): string {
        return `${mainContent}\n\n# User Flow and Use Cases\n\n${featureFlows.join("\n\n")}`;
    }
}
