import { ChatCodebaseService } from "@/modules/ai/ChatCodebaseService";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { message, repo, branch, model, history } = body;

        if (!message || !repo || !branch || !model) {
            return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
        }

        const owner = process.env.NEXT_PUBLIC_GITHUB_OWNER!;

        const chatService = new ChatCodebaseService();
        const result = await chatService.processMessage(
            owner,
            repo,
            branch,
            message,
            model,
            history
        );

        return NextResponse.json({
            response: result.response,
            codeReferences: result.codeReferences,
        });
    } catch (error: any) {
        console.error("Error in chat assistant API:", error);
        return NextResponse.json({ error: error.message || "An error occurred" }, { status: 500 });
    }
}
