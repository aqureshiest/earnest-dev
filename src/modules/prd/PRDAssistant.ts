import { PRDInput, KeyFeature, FigmaScreenAnalysis } from "@/types/prd";
import { AIServiceFactory } from "../ai/clients/AIServiceFactory";
import { BaseAIService } from "../ai/clients/BaseAIService";
import { FeatureFlowPrompt, defaultFeatureFlowPrompt } from "./featureFlowPrompt";

export class PRDAssistant {
    private aiService: BaseAIService;
    private featureFlowPrompt: FeatureFlowPrompt;

    constructor(model: string, featureFlowPrompt?: FeatureFlowPrompt) {
        this.aiService = AIServiceFactory.createAIService(model);
        this.featureFlowPrompt = featureFlowPrompt || defaultFeatureFlowPrompt;
    }

    async generateMainSections(input: PRDInput): Promise<string> {
        const systemPrompt = `You are a senior product manager creating a comprehensive PRD.
Generate the following sections in markdown:

# Overview
# Business Goals
# User Goals
# Non Goals`;

        const userPrompt = `Based on this input, generate the PRD sections:

Goal Statement: ${input.goalStatement}

Target Audience: ${input.targetAudience.join("\n")}

Key Features:
${input.keyFeatures.map((f) => `- ${f.name}: ${f.description}`).join("\n")}

Constraints: ${input.constraints.join("\n")}

Requirements:
1. Generate only the Overview, Business Goals, User Goals, and Non Goals sections
2. Use clear markdown formatting
3. Be specific and practical rather than theoretical`;

        const response = await this.aiService.generateResponse(systemPrompt, userPrompt);
        return response.response;
    }

    async generateFeatureFlow(
        feature: KeyFeature,
        input: PRDInput,
        screenAnalyses: FigmaScreenAnalysis[]
    ): Promise<string> {
        // Use the external prompt for the system part
        const systemPrompt = this.featureFlowPrompt.system;

        // Build a string from the screen analyses
        const screenAnalysesStr = screenAnalyses
            .map(
                (screen) => `
Screen: ${screen.screenName}
Analysis: ${screen.analysis}
---`
            )
            .join("\n");

        // Replace the placeholders in the user prompt template
        const userPrompt = this.featureFlowPrompt.user
            .replace(/{{featureName}}/g, feature.name)
            .replace(/{{featureDescription}}/g, feature.description)
            .replace(/{{featurePriority}}/g, feature.priority)
            .replace(/{{screenAnalyses}}/g, screenAnalysesStr)
            .replace(/{{goalStatement}}/g, input.goalStatement)
            .replace(/{{targetAudience}}/g, input.targetAudience.join(", "))
            .replace(/{{clarifyingQuestions}}/g, feature.clarifyingQuestions || "");

        const response = await this.aiService.generateResponse(systemPrompt, userPrompt);
        return response.response;
    }
}
