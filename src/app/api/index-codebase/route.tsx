import { NextResponse } from "next/server";
import { PrepareCodebase } from "@/modules/ai/PrepareCodebase";

export async function POST(req: Request) {
    const body = await req.json();
    const { repo, branch } = body;
    const taskId = Date.now().toString();
    const owner = process.env.NEXT_PUBLIC_GITHUB_OWNER!;

    if (!repo || !branch) {
        return NextResponse.json({ error: "Repository and branch are required" }, { status: 400 });
    }

    try {
        console.log(`Starting codebase indexing for ${owner}/${repo}:${branch}`);

        // Create a task request object
        const taskRequest: CodingTaskRequest = {
            taskId,
            owner,
            repo,
            branch,
            task: "",
            model: "na",
            files: [],
            params: { forceFullSync: true }, // Force a full sync and reindex
        };

        // Prepare the codebase - this will index everything
        const prepareCodebase = new PrepareCodebase();
        await prepareCodebase.prepare(taskRequest);

        return NextResponse.json({
            success: true,
            message: "Codebase indexed successfully",
        });
    } catch (error: any) {
        console.error("Error indexing codebase:", error);
        return NextResponse.json(
            { error: error.message || "Failed to index codebase" },
            { status: 500 }
        );
    }
}
