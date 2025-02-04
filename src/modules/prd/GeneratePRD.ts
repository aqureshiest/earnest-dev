import { PRDInput, KeyFeature, FigmaScreenAnalysis, FigmaScreen } from "@/types/prd";
import { AIServiceFactory } from "../ai/clients/AIServiceFactory";
import { BaseAIService } from "../ai/clients/BaseAIService";
import { FigmaProcessor } from "./FigmaProcessor";

export class GeneratePRD {
    private aiService: BaseAIService;
    private figmaProcessor?: FigmaProcessor;

    constructor(model: string) {
        this.aiService = AIServiceFactory.createAIService(model);
        this.figmaProcessor = new FigmaProcessor(model);
    }

    async generatePRD(input: PRDInput): Promise<string> {
        try {
            // 1. Generate user flows for each feature with its screens
            const featureFlows = await Promise.all(
                input.keyFeatures.map((feature) => {
                    console.log("Generating feature flows for", feature.name);
                    return this.generateFeatureFlows(feature, input);
                })
            );

            // 2. Generate the PRD sections except user flows
            console.log("Generating PRD sections...");
            const systemPrompt = `You are a senior product manager creating a comprehensive PRD.
Generate the following sections in markdown:

# Overview
# Business Goals
# User Goals
# Non Goals

After generating these sections, I will append the pre-generated User Flow and Use Cases section.`;

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

            // 3. Combine the generated sections with the feature flows
            return (
                response.response + "\n\n# User Flow and Use Cases\n\n" + featureFlows.join("\n\n")
            );
        } catch (error) {
            throw new Error(`Failed to generate PRD: ${error}`);
        }
    }

    private async generateFeatureFlows(feature: KeyFeature, input: PRDInput): Promise<string> {
        // Analyze screens if they exist for this feature
        let screenAnalyses: FigmaScreenAnalysis[] = [];
        if (feature.figmaScreens && feature.figmaScreens.length > 0) {
            const result = await this.figmaProcessor?.analyzeScreens(feature.figmaScreens, feature);
            screenAnalyses = result?.individualAnalyses || [];
        }

        const systemPrompt = `You are a senior product manager creating detailed user flows. 
Generate practical, step-by-step flows in markdown format.`;

        const userPrompt = `Create detailed user flows for this feature:

Feature: ${feature.name}
Description: ${feature.description}
Priority: ${feature.priority}

Associated Screens:
${screenAnalyses
    .map(
        (screen) => `
Screen: ${screen.screenName}
Analysis: ${screen.analysis}
---`
    )
    .join("\n")}

Product Context:
- Goal: ${input.goalStatement}
- Target Users: ${input.targetAudience.join(", ")}

Include:
1. Main user journey with specific steps
2. Screen transitions
3. User actions and system responses
4. Error scenarios and edge cases`;

        const response = await this.aiService.generateResponse(systemPrompt, userPrompt);
        return response.response;
    }
}
