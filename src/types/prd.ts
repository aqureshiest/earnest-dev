export interface FigmaScreen {
    id: string;
    name: string; // Descriptive name like "Login Screen" or "Settings Page"
    imageBuffer: Buffer | ArrayBuffer;
    description?: string; // Optional context about the screen
}

export interface FigmaScreenAnalysis {
    screenId: string;
    screenName: string;
    analysis: string;
    imageUrl?: string;
}

export interface PRDInput {
    goalStatement: string;
    targetAudience: string[];
    keyFeatures: KeyFeature[];
    constraints: string[];
}

export interface KeyFeature {
    id: string;
    name: string;
    description: string;
    priority: "high" | "medium" | "low";
    figmaScreens?: FigmaScreen[];
}

export interface PRDFeedback {
    sectionId: string; // e.g., "overview", "user_flows_feature_1"
    originalContent: string;
    feedback: string;
    suggestedChanges?: string;
}
