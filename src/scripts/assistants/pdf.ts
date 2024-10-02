import { LLM_MODELS } from "@/modules/utils/llmInfo";
import fs from "fs";
import { loadEnvConfig } from "@next/env";
import axios from "axios";
import FormData from "form-data";
import { PrepareCodebase } from "@/modules/ai/PrepareCodebase";
import { TokenLimiter } from "@/modules/ai/support/TokenLimiter";
import { XMLBuilder } from "fast-xml-parser";
import { formatXml } from "@/modules/utils/formatXml";
import { JiraTicketsAssistant } from "@/modules/ai/assistants/under-development/jira/JiraTicketsAssistant";
import { FeatureBreakdownAssistant } from "@/modules/ai/assistants/under-development/jira/FeatureBreakdownAssistant";

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
    console.log("PDF response ready");

    const request: TaskRequest = {
        taskId: Date.now().toString(),
        task: "",
        model: LLM_MODELS.ANTHROPIC_CLAUDE_3_5_SONNET,
        params: {
            technicalDesignDoc: pdfResponse.content,
        },
    };
    console.log("pdf task id", request.taskId);

    const assistant = new FeatureBreakdownAssistant();
    const featuresResponse = await assistant.process(request);
    console.log("Features response ready");

    const features = featuresResponse!.response;
    console.log("Features", JSON.stringify(features, null, 2));

    // get the first feature
    const firstFeature = features?.feature[0];
    console.log("First feature", firstFeature);

    const codebase = new PrepareCodebase();

    const request2: CodingTaskRequest = {
        taskId: Date.now().toString(),
        owner: "aqureshiest",
        repo: "laps-snapshot",
        branch: "main",
        task: firstFeature?.description || "",
        model: LLM_MODELS.ANTHROPIC_CLAUDE_3_5_SONNET,
        files: [],
        params: {
            technicalDesignDoc: pdfResponse.content,
            featureForJira: formatXml(firstFeature),
        },
    };

    const files = await codebase.prepare(request2);
    console.log("Files prepared");
    request2.files = files;

    const jiraTickets = new JiraTicketsAssistant();
    const result = await jiraTickets.process(request2);
    console.log("Jira tickets generated", result);
};
