import { NextResponse } from "next/server";
import { OutputVisualizationGenerator } from "@/modules/ai/extensions/OutputVisualizationGenerator";
import { ExtensionConfig } from "@/modules/ai/extensions/types";

export async function POST(req: Request) {
    try {
        const { config } = await req.json();

        const generator = new OutputVisualizationGenerator();
        const visualizationConfig = await generator.generateVisualization(
            config as ExtensionConfig
        );

        return NextResponse.json(visualizationConfig);
    } catch (error: any) {
        console.error("Error generating visualization config:", error);
        return NextResponse.json(
            { error: `Failed to generate visualization: ${error.message}` },
            { status: 500 }
        );
    }
}
