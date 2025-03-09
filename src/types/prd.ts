export interface PRDTaskRequest extends TaskRequest {
    input: PRDInput;
    overrides?: {
        featurePrompt?: string;
    };
}

export interface FigmaScreen {
    id: string;
    name: string;
    imageBuffer: Buffer | ArrayBuffer;
    description?: string;
}

export interface FigmaScreenAnalysis {
    screenId: string;
    screenName: string;
    analysis: string;
    imageUrl?: string;
}

export interface KeyFeature {
    id: string;
    name: string;
    description: string;
    priority: "high" | "medium" | "low";
    figmaScreens?: FigmaScreen[];
    clarifyingQuestions?: string;
}

export interface PRDInput {
    goalStatement: string;
    targetAudience: string[];
    keyFeatures: KeyFeature[];
    constraints: string[];
}

export interface PRDFeedback {
    sectionId: string;
    originalContent: string;
    feedback: string;
    suggestedChanges?: string;
}

export type QuestionType = "single" | "multiple";

export interface QuestionChoice {
    id: string;
    text: string;
}

export interface FeatureQuestion {
    id: string;
    question: string;
    type: QuestionType;
    choices: QuestionChoice[];
    answer: string[]; // Array of selected choice IDs
}

export interface FeatureQuestions {
    featureId: string;
    featureName: string;
    questions: FeatureQuestion[];
}
