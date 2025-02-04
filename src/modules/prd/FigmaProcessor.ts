import { FigmaAnalysisResult, FigmaScreen, FigmaScreenAnalysis, KeyFeature } from "@/types/prd";
import { BaseAIService } from "../ai/clients/BaseAIService";
import { AIServiceFactory } from "../ai/clients/AIServiceFactory";

export class FigmaProcessor {
    private aiService: BaseAIService;

    constructor(model: string) {
        this.aiService = AIServiceFactory.createAIService(model);
    }

    async analyzeScreens(
        screens: FigmaScreen[],
        feature: KeyFeature
    ): Promise<FigmaAnalysisResult> {
        try {
            // Analyze each screen individually with feature context
            const screenAnalyses = await Promise.all(
                screens.map((screen) => this.analyzeScreen(screen, feature))
            );

            // Then combine all analyses
            const combinedAnalysis = await this.generateCombinedAnalysis(screenAnalyses, feature);

            return {
                individualAnalyses: screenAnalyses,
                combinedAnalysis,
            };
        } catch (error) {
            console.error("Error in screen analysis:", error);
            throw new Error(`Failed to complete screen analysis: ${error}`);
        }
    }

    private async analyzeScreen(
        screen: FigmaScreen,
        feature: KeyFeature
    ): Promise<FigmaScreenAnalysis> {
        const systemPrompt = `You are an expert UI/UX designer and front-end developer.
Your task is to analyze UI screenshots with particular attention to:
1. Complete user journeys and interaction flows
2. Data elements and their specifications
3. UI states (loading, error, success)
4. Edge cases and error handling
5. Component interactions and dependencies

This screen is part of the "${feature.name}" feature: ${feature.description}

Provide specific, detailed analysis that can be used in a PRD.`;

        const userPrompt = `Please analyze this UI screen named "${screen.name}":
${screen.description ? `\nContext: ${screen.description}` : ""}

Provide a detailed analysis covering:
1. Screen Purpose & Overview
2. Key UI Components
3. User Interactions & Flows
4. Data Elements
5. States & Error Handling
6. Navigation & Transitions`;

        try {
            const response = await this.aiService.generateImageResponse(
                systemPrompt,
                userPrompt,
                screen.imageBuffer
            );

            return {
                screenId: screen.id,
                screenName: screen.name,
                analysis: response.response,
            };
        } catch (error) {
            throw new Error(`Failed to analyze screen ${screen.name} (${screen.id}): ${error}`);
        }
    }

    private async generateCombinedAnalysis(
        analyses: FigmaScreenAnalysis[],
        feature: KeyFeature
    ): Promise<string> {
        const systemPrompt = `You are a Product Requirements Document (PRD) writer who excels at synthesizing UI/UX analyses into clear, structured documentation.
You are analyzing screens for the "${feature.name}" feature: ${feature.description}`;

        const userPrompt = `I have detailed analyses of multiple screens from a user interface. Here are the analyses for each screen:

${analyses
    .map(
        (a) => `=== ${a.screenName} ===
${a.analysis}
---`
    )
    .join("\n\n")}

Based on these screen analyses, please provide a comprehensive analysis structured as follows:

1. User Flows
   - Detail each complete user journey
   - Show how users navigate between screens
   - Include all possible paths and decision points

2. Data & State Management
   - List all data elements and their relationships
   - Describe state management requirements
   - Specify data validation rules

3. Interaction Patterns
   - Detail key interactions between components
   - Describe reusable patterns across screens
   - Highlight dependencies between different parts

4. Error Handling & Edge Cases
   - List potential error scenarios
   - Describe error handling requirements
   - Identify edge cases that need special handling

Please write this in a clear, structured format suitable for a PRD. Focus on being specific and actionable.`;

        try {
            const response = await this.aiService.generateResponse(systemPrompt, userPrompt);
            return response.response;
        } catch (error) {
            throw new Error(`Failed to generate combined analysis: ${error}`);
        }
    }
}
