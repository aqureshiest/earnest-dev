import { NextResponse } from "next/server";
import { ClaudeAIService } from "@/modules/ai/clients/ClaudeAIService";
import { LLM_MODELS } from "@/modules/utils/llmInfo";

export async function POST(req: Request) {
    try {
        const { description } = await req.json();

        if (!description || description.trim() === "") {
            return NextResponse.json({ error: "Task description is required" }, { status: 400 });
        }

        // Use Claude to improve the task description
        const aiService = new ClaudeAIService(LLM_MODELS.ANTHROPIC_CLAUDE_3_5_HAIKU_NEW.id);

        const systemPrompt = `
You are a helpful assistant that improves task descriptions for coding tasks. 
Your goal is to refine the provided task description to make it more clear, detailed, and actionable for AI code generation.

<guidelines>
1. Maintain the original intent and scope of the task
2. Add specific implementation details that would help an AI assistant understand what to build
3. Clarify ambiguous requirements
4. Add any technical considerations relevant to the implementation
5. Don't be overzealous in your improvements - keep changes focused and minimal
6. Focus on clarifying the "what" and "why" of the task
7. Keep the tone professional and concise
8. Preserve any specific requirements or constraints mentioned in the original description
</guidelines>

The output should be a refined version of the original task description, not a completely new description.
`;

        const userPrompt = `
Here is the original task description:

"""
${description}
"""

Respond only with the improved task description, enclosed in the <improved_description> tags.

<improved_description>
improved task description here
</improved_description>
`;

        const { response } = await aiService.generateResponse(systemPrompt, userPrompt);

        // extract the improved description from the response
        const match = response.match(/<improved_description>([\s\S]*?)<\/improved_description>/);
        if (!match || match.length < 2) {
            return NextResponse.json(
                { error: "Failed to extract improved description" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            original: description,
            improved: match[1].trim(),
        });
    } catch (error: any) {
        console.error("Error improving task description:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
