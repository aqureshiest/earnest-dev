import { LLM_MODELS } from "@/modules/utils/llmInfo";
import fs from "fs";
import { loadEnvConfig } from "@next/env";
import axios from "axios";
import FormData from "form-data";
import { PrepareCodebase } from "@/modules/ai/PrepareCodebase";
import { TasksForCodebaseAssistant } from "@/modules/ai/assistants/archive/TasksForCodebaseAssistant";

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

export const tasksWCode = async () => {
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

    const repo = "laps-snapshot";

    // --

    const request: CodingTaskRequest = {
        taskId: Date.now().toString(),
        owner: "aqureshiest",
        repo: repo,
        branch: "main",
        task: "",
        model: LLM_MODELS.ANTHROPIC_CLAUDE_3_5_SONNET,
        files: [],
        params: {
            technicalDesignDoc: pdfXml,
        },
    };
    console.log("request task id", request.taskId);

    const prepareCodebase = new PrepareCodebase();
    const files = await prepareCodebase.prepare(request);
    console.log("files length", files.length);
    request.files = files;

    // --

    // const first = new TasksForCodebaseAssistant2();
    // request.params.technicalDesignDoc = pdfXml;
    // await first.process(request);

    // // --

    // const second = new TasksForCodebaseAssistant();
    // await second.process(request);

    const third = new TasksForCodebaseAssistant();
    await third.process(request);
};
