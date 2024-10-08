import { NextResponse } from "next/server";
import { AIServiceFactory } from "@/modules/ai/clients/AIServiceFactory";

interface ImprovementRequest {
    ticket: Ticket;
    tddContent: string;
    userPrompt: string;
    model: string;
}

export async function POST(req: Request) {
    let response;

    try {
        const body: ImprovementRequest = await req.json();
        const { ticket, tddContent, userPrompt, model } = body;

        // Create AI service
        const aiService = AIServiceFactory.createAIService(model);

        // Prepare the message for Claude
        const systemPrompt = `
You are an AI assistant specialized in improving software development tickets. Your task is to help enhance the quality and completeness of the given ticket based on the provided technical design document and STRICTLY LIMITED TO the user's specific request.`;

        const prompt = `First, carefully review the following technical design document:

${tddContent}

Now, consider the following ticket:

${JSON.stringify(ticket, null, 2)}

The user has requested the following specific improvement:

${userPrompt}

Please assist the user by improving the ticket ONLY based on their specific request. Follow these guidelines:

1. Apply ONLY the changes that the user has explicitly asked for.
2. Do not modify any other parts of the ticket that are not directly related to the user's request.
3. Use the technical design document as context to inform the requested changes, but do not add information from it unless it directly relates to the user's request.
4. If the user's request requires modifying related fields (e.g., updating effort if complexity changes), you may do so, but explain why in your response.
5. Ensure that your changes align with the technical design document and maintain the ticket's overall coherence.

Return your response in the following JSON format:

{
    "updatedTicket": {
        // The entire updated ticket object here
    },
    "explanation": "A one line brief explanation of the changes made and why, based on the user's request."
}

Ensure that the "updatedTicket" object maintains the original structure of the ticket.
`;

        // Process the request
        response = await aiService.generateResponse(systemPrompt, prompt);

        // Extract the JSON block from the response
        const responseText = response.response;
        console.log("Response text:", responseText);

        // Parse the response
        const json = parseJSONResponse(responseText);
        const improvedTicket = json.updatedTicket;
        const explanation = json.explanation;

        // Return the improved ticket and explanation
        return NextResponse.json({ updatedTicket: improvedTicket, explanation });
    } catch (error) {
        console.error("Error improving ticket:", error);
        return NextResponse.json({ error: "Failed to improve ticket" }, { status: 500 });
    }
}

function parseJSONResponse(response: string) {
    let jsonString = response;

    // Check if the response is wrapped in ```json and ``` markers
    const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
    const match = response.match(jsonRegex);

    if (match) {
        // If wrapped, extract the JSON string
        jsonString = match[1];
    }

    try {
        // Attempt to parse the JSON string
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Error parsing JSON:", error);
        return null;
    }
}
