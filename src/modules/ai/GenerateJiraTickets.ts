import { displayTime } from "../utils/displayTime";
import { formatXml } from "../utils/formatXml";
import { sendTaskUpdate } from "../utils/sendTaskUpdate";
import { JiraTicketsAssistant } from "./assistants/under-development/tasks/JiraTicketsAssistant";
import { TDDAnalystAssistant } from "./assistants/under-development/tasks/TDDAnalystAssistant";
import { PrepareCodebase } from "./PrepareCodebase";

export class GeneateJiraTickets {
    constructor() {}

    async runWorkflow(taskRequest: JiraTicketsRequest) {
        const { taskId, owner, repo, branch, model, tddProcessed } = taskRequest;

        // track start time
        const startTime = new Date().getTime();
        let totalCost = 0;

        sendTaskUpdate(taskId, "progress", "Analyzing Technical Design document...");

        // analyze tdd request
        const analyzeTdd: TaskRequest = {
            taskId,
            task: "",
            model,
            params: {
                technicalDesignDoc: this.prepareTddXml(tddProcessed),
            },
        };

        // run the assistant to analyze the tdd
        const tddAnalyst = new TDDAnalystAssistant();
        const tddAnalysis = await tddAnalyst.process(analyzeTdd);

        if (!tddAnalysis || !tddAnalysis.response || !tddAnalysis.response.detailedTasks) {
            throw new Error("Something went wrong in the TDD analysis.");
        }

        sendTaskUpdate(taskId, "progress", "Analysis completed.");
        this.emitMetrics(taskId, tddAnalysis);
        totalCost += tddAnalysis.cost;

        // prepare input for generating Jira tickets
        const tddContext = this.prepareTddContext(tddAnalysis.response);

        // send update for how many tasks
        let current = 0;
        sendTaskUpdate(taskId, "tasks-progress", {
            current,
            numberOfTasks: tddAnalysis.response.detailedTasks.length,
        });

        // for each detailed task listed in the TDD analysis, we need to generate tickets
        for (const detailedTask of tddAnalysis.response.detailedTasks) {
            const detailedTaskXml = formatXml(detailedTask);

            // generate ticket for each detailed task
            const ticketRequest: CodingTaskRequest = {
                taskId,
                owner,
                repo,
                branch,
                task: "",
                model,
                files: [],
                params: {
                    tddContext,
                    detailedTask: detailedTaskXml,
                },
            };

            sendTaskUpdate(
                taskId,
                "progress",
                `Generating Jira tickets for task: ${detailedTask.name}...`
            );

            sendTaskUpdate(taskId, "progress", "Finding relevant code snippets...");

            // capture relevant codebase
            const codebase = new PrepareCodebase();
            const files = await codebase.prepare(ticketRequest);
            ticketRequest.files = files;

            // run the assistant to generate tickets
            const jiraTickets = new JiraTicketsAssistant();
            const tickets = await jiraTickets.process(ticketRequest);

            if (!tickets) {
                throw new Error("Something went wrong in generating Jira tickets.");
            }

            sendTaskUpdate(taskId, "progress", "Tickets generated.");
            sendTaskUpdate(taskId, "complete", tickets.response);
            this.emitMetrics(taskId, tickets);
            totalCost += tickets.cost;

            sendTaskUpdate(taskId, "tasks-progress", {
                current: ++current,
                numberOfTasks: tddAnalysis.response.detailedTasks.length,
            });
        }

        sendTaskUpdate(taskId, "progress", `Total Cost: $${totalCost.toFixed(6)}`);

        const endTime = new Date().getTime();
        sendTaskUpdate(taskId, "progress", `Time taken: ${displayTime(startTime, endTime)}`);
    }

    // helper function to prepare TDD XML
    private prepareTddXml = (processedTdd: any) => {
        const pdfXml = `<content>
${processedTdd.text_content}
</content>
<images>
${processedTdd.images
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
        return pdfXml;
    };

    // helper function to prepare TDD context
    private prepareTddContext = (tddAnalysis: any) => {
        // copy TDDAnalysis to a second object
        const tddAnalysisCopy = { ...tddAnalysis };

        // remove detailed tasks
        delete tddAnalysisCopy.detailedTasks;

        // create tdd context
        const tddContext = formatXml(tddAnalysisCopy);
        return tddContext;
    };

    private async emitMetrics(taskId: string, result: AIAssistantResponse<any>) {
        sendTaskUpdate(
            taskId,
            "progress",
            `*Approximated tokens: ${result.calculatedTokens.toFixed(0)}`
        );
        sendTaskUpdate(taskId, "progress", `*Actual Input tokens: ${result.inputTokens}`);
        sendTaskUpdate(taskId, "progress", `*Actual Output tokens: ${result.outputTokens}`);
        sendTaskUpdate(taskId, "progress", `*Cost: $${result.cost.toFixed(6)}`);
    }
}
