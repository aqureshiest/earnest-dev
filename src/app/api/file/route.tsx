import { GitHubService } from "@/modules/github/GitHubService";

export async function POST(req: Request) {
    const { owner, repo, branch, filePath } = await req.json();

    try {
        const ghService = new GitHubService();

        // get file
        const fileData = await ghService.readFile(owner, repo, branch, filePath);

        if (!("content" in fileData)) {
            throw new Error("No content found in file");
        }

        // get file contents
        const contents = Buffer.from(fileData.content, "base64").toString("utf-8");

        return new Response(JSON.stringify({ contents }), {
            headers: { "Content-Type": "application/json" },
        });
    } catch (e) {
        console.log(e);
        return new Response(JSON.stringify({ error: (e as any).message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
