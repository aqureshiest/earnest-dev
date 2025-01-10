import { NextResponse } from "next/server";
import { ExtensionDataStore } from "@/modules/ai/extensions/ExtensionDataStore";

export async function POST(req: Request) {
    try {
        const config = await req.json();
        const dataStore = new ExtensionDataStore();

        const savedExtension = await dataStore.saveExtensionConfig(config);
        return NextResponse.json(savedExtension);
    } catch (error) {
        console.error("Error saving extension:", error);
        return NextResponse.json({ error: "Failed to save extension" }, { status: 500 });
    }
}
