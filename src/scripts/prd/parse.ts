import { PRDGeneratorAssistant } from "@/modules/ai/assistants/prd/PRDGeneratorAssistant";
import { LLM_MODELS } from "@/modules/utils/llmInfo";
import { loadEnvConfig } from "@next/env";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";

// Load environment variables
loadEnvConfig("");

export const parsePrd = async () => {
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

    const imagePath = "/Users/adeelqureshi/Downloads/personal-loans-prd.pdf";

    console.log("Processing PDF:", imagePath);
    const pdfResponse = await sendPdfToApi(imagePath);
    console.log("PDF processed");

    const assistant = new PRDGeneratorAssistant();
    const request: TaskRequest = {
        taskId: Date.now().toString(),
        task: "Generate PRD",
        model: LLM_MODELS.OPENAI_GPT_4O.id,
        params: {
            productDocument: pdfResponse.content,
        },
    };
    const response = await assistant.process(request);
    console.log(response?.response);
};
