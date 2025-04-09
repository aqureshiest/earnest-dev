import PullRequestService from "@/modules/github/PullRequestService";
import { NextRequest, NextResponse } from "next/server";

interface PatchRequest {
    owner: string;
    repo: string;
    branch: string;
    title: string;
    codeChanges: CodeChanges;
    authorEmail?: string;
}

export async function POST(req: NextRequest) {
    try {
        const { owner, repo, branch, title, codeChanges, authorEmail } =
            (await req.json()) as PatchRequest;

        // Validate required inputs
        if (!owner || !repo || !branch || !codeChanges) {
            return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
        }

        // Create Pull Request Service
        const prService = new PullRequestService(owner, repo, branch);

        // Generate the patch
        const patchContent = await prService.createPatch(
            codeChanges,
            title || "Generated code changes"
        );

        // Add a note about AI-Generated label for consistency with PR creation
        const patchWithLabelNote = patchContent + 
            "\n# Note: When applying this patch, consider adding the 'AI-Generated' label\n" +
            "# to maintain consistency with PRs created through the application.\n";

        // Create a response with the patch content as a downloadable file
        const response = new NextResponse(patchWithLabelNote);

        // Set appropriate headers for file download
        response.headers.set("Content-Type", "text/plain");
        response.headers.set(
            "Content-Disposition",
            `attachment; filename="${repo}-${branch}-changes.patch"`
        );

        return response;
    } catch (error: any) {
        console.error("Error generating patch:", error);

        return NextResponse.json(
            { error: error.message || "Failed to generate patch" },
            { status: 500 }
        );
    }
}
