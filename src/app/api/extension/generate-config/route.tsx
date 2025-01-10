import { NextResponse } from "next/server";
import { ConfigurationGenerator } from "@/modules/ai/extensions/ConfigurationGenerator";

export async function POST(req: Request) {
    try {
        const { messages, currentConfig } = await req.json();
        const configGenerator = new ConfigurationGenerator();

        const userMessages = messages.filter((m: any) => m.role === "user");
        const isFirstMessage = userMessages.length === 1;
        const lastUserMessage = userMessages[userMessages.length - 1].content;

        // Start with current config or empty object
        let config = { ...currentConfig };

        // For first message, try to extract initial configuration
        if (isFirstMessage) {
            const initialConfig = await configGenerator.extractInitialConfig(lastUserMessage);
            if (Object.keys(initialConfig).length > 0) {
                config = { ...config, ...initialConfig };
            }
        }

        // Get next conversation step
        const response = await configGenerator.getNextConversationStep(messages, config);

        // Update config with any new information
        if (response.configUpdate) {
            config = { ...config, ...response.configUpdate };
        }

        // Generate full configuration if conversation is complete
        if (response.conversationComplete && !config.systemPrompt) {
            config = await configGenerator.generateFullConfig(config);
        }

        return NextResponse.json({
            message: response.message,
            config,
        });
    } catch (error) {
        console.error("Error generating extension config:", error);
        return NextResponse.json(
            { error: "Failed to generate extension configuration" },
            { status: 500 }
        );
    }
}
