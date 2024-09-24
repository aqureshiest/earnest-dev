import { LLM_MODELS } from "@/modules/utils/llmInfo";
import fs from "fs";
import { loadEnvConfig } from "@next/env";
import axios from "axios";
import FormData from "form-data";
import { TDDAnalystAssistant } from "@/modules/ai/assistants/under-development/tasks/TDDAnalystAssistant";
import { PrepareCodebase } from "@/modules/ai/PrepareCodebase";
import { TokenLimiter } from "@/modules/ai/support/TokenLimiter";
import { XMLBuilder } from "fast-xml-parser";
import { formatXml } from "@/modules/utils/formatXml";
import { JiraTicketsAssistant } from "@/modules/ai/assistants/under-development/tasks/JiraTicketsAssistant";

loadEnvConfig("");

async function sendPdfToApi(pdfPath: string) {
    // Create a new FormData instance
    const form = new FormData();

    // Add the file to the form data
    form.append("file", fs.createReadStream(pdfPath), {
        filename: "document.pdf",
        contentType: "application/pdf",
    });

    const response = await axios.post("http://localhost:8000/parse-pdf/", form, {
        headers: {
            ...form.getHeaders(),
            Accept: "application/json",
        },
    });

    // console.log(response.data);
    return response.data;
}

export const pdf = async () => {
    const imagePath = "/Users/adeelqureshi/Downloads/erd.pdf";

    console.log("Processing PDF:", imagePath);
    const pdfResponse = await sendPdfToApi(imagePath);
    console.log("PDF processed");

    const pdfXml = `<content>
${pdfResponse.text_content}
</content>
<images>
${pdfResponse.images
    .map(
        (image: any) =>
            `<image>
      <reference>${image.reference}</reference>
      <page_number>${image.page_number}</page_number>
      <media_type>${image.media_type}</media_type>
      <description>${image.description}</description>
    </image>`
    )
    .join("\n")}
</images>`;
    console.log("PDF xml ready");

    const request: TaskRequest = {
        taskId: Date.now().toString(),
        task: "",
        model: LLM_MODELS.ANTHROPIC_CLAUDE_3_5_SONNET,
        params: {
            technicalDesignDoc: pdfXml,
        },
    };
    console.log("pdf task id", request.taskId);

    const task = new TDDAnalystAssistant();
    const TDDAnalysisRepsonse = await task.process(request);
    const TDDAnalysis = TDDAnalysisRepsonse!.response;

    // copy TDDAnalysis to a second object
    const TDDAnalysisCopy = { ...TDDAnalysis };
    // remove detailed tasks
    delete TDDAnalysisCopy.detailedTasks;
    // create tdd context
    const tddContext = formatXml(TDDAnalysisCopy);

    // get first detailed task
    const detailedTask = TDDAnalysis!.detailedTasks[0];
    const detailedTaskXml = formatXml(detailedTask);
    // get second last detailed task
    const secondLastDetailedTask =
        TDDAnalysis!.detailedTasks[TDDAnalysis!.detailedTasks.length - 2];
    const secondLastDetailedTaskXml = formatXml(secondLastDetailedTask);

    const codebase = new PrepareCodebase();

    const request2: CodingTaskRequest = {
        taskId: Date.now().toString(),
        owner: "aqureshiest",
        repo: "laps-snapshot",
        branch: "main",
        task: secondLastDetailedTaskXml,
        model: LLM_MODELS.ANTHROPIC_CLAUDE_3_5_SONNET,
        files: [],
        params: {
            tddContext,
            detailedTask: secondLastDetailedTaskXml,
        },
    };

    const files = await codebase.prepare(request2);
    console.log("Files prepared");
    request2.files = files;

    const jiraTickets = new JiraTicketsAssistant();
    const result = await jiraTickets.process(request2);
    console.log("Jira tickets generated", result);
};
