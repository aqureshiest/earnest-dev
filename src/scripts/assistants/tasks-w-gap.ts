import { LLM_MODELS } from "@/modules/utils/llmInfo";
import fs from "fs";
import { loadEnvConfig } from "@next/env";
import axios from "axios";
import FormData from "form-data";
import { PrepareCodebase } from "@/modules/ai/PrepareCodebase";
import { AggregatorAssistant } from "@/modules/ai/assistants/archive/repo-analyzer/AggregatorAssistant";
import { ChunksAnalyzerAssistant } from "@/modules/ai/assistants/archive/repo-analyzer/ChunksAnalyzerAssistant";
import { TDDAnalystAssistant } from "@/modules/ai/assistants/under-development/tasks/TDDAnalystAssistant";

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

export const tasksWGap = async () => {
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

    const codeAnalyzer = new ChunksAnalyzerAssistant();

    const analyze: CodingTaskRequest = {
        taskId: Date.now().toString(),
        owner: "aqureshiest",
        repo: repo,
        branch: "main",
        task: "",
        model: LLM_MODELS.ANTHROPIC_CLAUDE_3_5_SONNET,
        files: [],
    };
    console.log("analyze task id", analyze.taskId);

    const prepareCodebase = new PrepareCodebase();
    console.log("preparing codebase");
    const files = await prepareCodebase.prepare(analyze);
    console.log("files length", files.length);
    analyze.files = files;

    const analyses = await codeAnalyzer.process(analyze);

    // --

    const aggregator = new AggregatorAssistant();
    const aggregate: TaskRequest = {
        taskId: Date.now().toString(),
        task: "",
        model: LLM_MODELS.ANTHROPIC_CLAUDE_3_5_SONNET,
        params: {
            chunkAnalyses: analyses?.responseStr,
        },
    };
    console.log("aggregate task id", aggregate.taskId);
    const aggregated = await aggregator.process(aggregate);

    // --

    const tddAnalyst = new TDDAnalystAssistant();
    const tddAnalysis: TaskRequest = {
        taskId: Date.now().toString(),
        task: "",
        model: LLM_MODELS.ANTHROPIC_CLAUDE_3_5_SONNET,
        params: {
            technicalDesignDoc: pdfXml,
        },
    };
    console.log("tddAnalysis task id", tddAnalysis.taskId);
    const gapAnalysisResponse = await tddAnalyst.process(tddAnalysis);

    // --

    // const taskMaker = new TasksForGapsAssistant();
    // const tasksForGaps: CodingTaskRequest = {
    //     taskId: Date.now().toString(),
    //     task: "",
    //     model: LLM_MODELS.ANTHROPIC_CLAUDE_3_5_SONNET,
    //     owner: "aqureshiest",
    //     repo: repo,
    //     branch: "main",
    //     files,
    //     params: {
    //         gapAnalysis: gapAnalysisResponse?.response,
    //         technicalDesignDoc: pdfXml,
    //         repoAnalysis: aggregated?.response,
    //     },
    // };
    // console.log("tasksForGaps task id", tasksForGaps.taskId);
    // await taskMaker.process(tasksForGaps);
};
