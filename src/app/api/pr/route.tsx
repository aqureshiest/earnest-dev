import PullRequestService from "@/modules/github/PullRequestService";
import Ably from "ably";
import { GeneratePR } from "@/modules/ai/GeneratePR";

// private function to send message to ably
async function sendMessage(channel: any, message: string, messagePrefix = "overall") {
    await channel.publish(messagePrefix, message);
}

export async function POST(req: Request) {
    const { owner, repo, branch, description, selectedModel, params, prTitle, updatesChannel } =
        await req.json();

    const ably = new Ably.Rest(process.env.NEXT_PUBLIC_ABLY_API_KEY!);

    try {
        const channel = ably.channels.get(updatesChannel);

        const { implementationPlan, generatedCode } = params;

        const prGenerator = new GeneratePR(channel);

        // call the assistant to generate PR
        const response = await prGenerator.runWorkflow(selectedModel, description, {
            implementationPlan: implementationPlan.responseStr,
            generatedCode: generatedCode.responseStr,
        });

        await sendMessage(channel, "Creating pull request...");

        // generate PR
        const prService = new PullRequestService(owner, repo, branch);
        const prLink = await prService.createPullRequest(
            generatedCode.response,
            prTitle,
            response.response || description
        );

        await sendMessage(channel, "Pull request created.");
        return new Response(JSON.stringify({ prLink }), {
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
