import { FigmaScreen, FigmaScreenAnalysis, KeyFeature } from "@/types/prd";
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
    ): Promise<FigmaScreenAnalysis[]> {
        try {
            return await Promise.all(screens.map((screen) => this.analyzeScreen(screen, feature)));
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
5. Navigation & Transitions`;

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
}
