import { GitHubService } from "@/modules/github/GitHubService";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { action, query, per_page } = body;

        const ghService = new GitHubService();

        // fetch repositories
        if (action == "list-repos") {
            const repositories = await ghService.listRepos(query, per_page);

            return new Response(JSON.stringify(repositories), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }
        // fetch branches
        else if (action == "list-branches") {
            const { owner, repo } = body;
            const branches = await ghService.listBranches(owner, repo);

            return new Response(JSON.stringify(branches), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify({ error: "Invalid action" }), {
            status: 404,
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
