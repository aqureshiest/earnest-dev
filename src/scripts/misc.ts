import { AIServiceFactory } from "@/modules/ai/clients/AIServiceFactory";
import { formatXml } from "@/modules/utils/formatXml";
import { LLM_MODELS } from "@/modules/utils/llmInfo";
import { parseXml } from "@/modules/utils/parseXml";
import { XMLBuilder } from "fast-xml-parser";
import fs from "fs";

export const misc = async () => {
    const file = "/Users/adeelqureshi/earnest/earnest-dev/epics.xml";
    const content = fs.readFileSync(file, "utf-8");

    const parsed = parseXml(content);
    // copy into another object and remove technical_details from epics and tickets
    const copy = JSON.parse(JSON.stringify(parsed));
    copy.epics.epic_and_tickets.forEach((epic: any) => {
        delete epic.technical_details;
        epic.tickets.ticket.forEach((ticket: any) => {
            delete ticket.technical_details;
        });
    });

    // then print the copy
    // console.log(JSON.stringify(copy, null, 2));

    // write xml back to file
    const xml = formatXml(copy);
    fs.writeFileSync(file.replace(".xml", "-no-tech-details.xml"), xml);

    const aiService = AIServiceFactory.createAIService(LLM_MODELS.OPENAI_GPT_4O);
    const response = await aiService.generateResponse(
        `
You are a project manager who is responsible for planning a new project. Your task is to create a project plan using
the provided epics and tickets.`,
        `

Here are the epics and tickets you need to plan:
${xml}
`
    );

    console.log(response.response);
};
