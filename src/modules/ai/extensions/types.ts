export interface ExtensionConfig {
    id: string;
    name: string;
    description: string;
    systemPrompt: string;
    outputSchema: {
        type: string;
        structure: Record<string, any>; // The JSON schema
        resultKey: string;
    };
    uiConfig: {
        visualization: string;
        inputFields: Array<UIInputField>;
        outputViews: Array<{
            type: string;
            description: string;
        }>;
    };
    userInput?: {
        required: boolean;
        useRelevantFiles: boolean;
        description: string;
    };
}

export interface UIInputField {
    name: string;
    type: "text" | "select" | "multiselect" | "boolean";
    label: string;
    description: string;
    required: boolean;
    options?: string[];
    default?: any;
}

// Define PromptGeneratorOutput type as the subset of ExtensionConfig that the PromptGenerator produces
export type PromptGeneratorOutput = Pick<
    ExtensionConfig,
    "systemPrompt" | "outputSchema" | "uiConfig"
>;
