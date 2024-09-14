import { ClaudeAIService } from "@/modules/ai/clients/ClaudeAIService";
import { LLM_MODELS } from "@/modules/utils/llmInfo";
import fs from "fs";
import { loadEnvConfig } from "@next/env";
const axios = require("axios");
import FormData from "form-data";
import { ClaudeTaskMakerAssistant } from "@/modules/ai/assistants/ClaudeTaskMakerAssistant";
import { PrepareCodebase } from "@/modules/ai/PrepareCodebase";
import { TECHNICAL_DESIGN_DOC_PLACEHOLDER } from "@/constants";

loadEnvConfig("");

async function sendPdfToApi(pdfPath: string) {
    // Create a new FormData instance
    const form = new FormData();

    // Add the file to the form data
    form.append("file", fs.createReadStream(pdfPath), {
        filename: "document.pdf",
        contentType: "application/pdf",
    });

    try {
        const response = await axios.post("http://localhost:8000/parse-pdf/", form, {
            headers: {
                ...form.getHeaders(),
                Accept: "application/json",
            },
        });

        // console.log(response.data);
        return response.data;
    } catch (error: any) {
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error("Server responded with error:", error.response.data);
        } else if (error.request) {
            // The request was made but no response was received
            console.error("No response received:", error.request);
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error("Error setting up request:", error.message);
        }
        throw error;
    }
}
async function main() {
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

    const request: CodingTaskRequest = {
        taskId: "1",
        owner: "aqureshiest",
        repo: "laps-snapshot",
        branch: "main",
        task: "laps tickets",
        model: LLM_MODELS.ANTHROPIC_CLAUDE_3_5_SONNET,
        files: [],
        params: {},
    };

    const prepareCodebase = new PrepareCodebase();
    const files = await prepareCodebase.prepare(request);

    request.files = files;
    request.params = {
        ...request.params,
        technicalDesignDoc: pdfXml,
    };

    const taskMaker = new ClaudeTaskMakerAssistant();
    const x = await taskMaker.process(request);

    console.log(x);
}

main();
