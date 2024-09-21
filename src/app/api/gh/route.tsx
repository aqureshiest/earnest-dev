import { GitHubService } from "@/modules/github/GitHubService";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const ghService = new GitHubService();
    const { action, owner, repo, branch } = await req.json();

    try {
        switch (action) {
            case "list-repos":
                const repos = await ghService.listRepos(owner);
                return NextResponse.json(repos);
            case "list-branches":
                if (!owner || !repo) {
                    return NextResponse.json({ error: "Owner and repo are required" }, { status: 400 });
                }
                const branches = await ghService.listBranches(owner, repo);
                return NextResponse.json(branches);
            default:
                return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }
    } catch (error: any) {
        console.error("Error in GitHub API route:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}