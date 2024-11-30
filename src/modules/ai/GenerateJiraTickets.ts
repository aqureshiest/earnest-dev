import { displayTime } from "../utils/displayTime";
import { formatXml } from "../utils/formatXml";
import { sendTaskUpdate } from "../utils/sendTaskUpdate";
import { FeatureBreakdownAssistant } from "./assistants/jira/FeatureBreakdownAssistant";
import { JiraTicketsAssistant } from "./assistants/jira/JiraTicketsAssistant";
import { PrepareCodebase } from "./PrepareCodebase";

export class GeneateJiraTickets {
    constructor() {}

    async runWorkflow(taskRequest: JiraTicketsRequest) {
        const { taskId, owner, repo, branch, model, tddContent } = taskRequest;

        // track start time
        const startTime = new Date().getTime();
        let totalCost = 0;

        sendTaskUpdate(taskId, "progress", "Generating Features...");

        // generate features
        const breakdownFeatures: TaskRequest = {
            taskId,
            task: "",
            model,
            params: {
                technicalDesignDoc: tddContent,
            },
        };

        // run the assistant to analyze the tdd
        const featuresAssistant = new FeatureBreakdownAssistant();
        const featuresBreakdown = await featuresAssistant.process(breakdownFeatures);

        if (!featuresBreakdown || !featuresBreakdown.response) {
            throw new Error("Something went wrong in generating features.");
        }

        sendTaskUpdate(taskId, "progress", "Features generated.");
        this.emitMetrics(taskId, featuresBreakdown);
        totalCost += featuresBreakdown.cost;

        // send update for how many tasks
        let current = 0;
        const numberOfTasks = featuresBreakdown.response.feature.length;
        sendTaskUpdate(taskId, "tasks-progress", {
            current,
            numberOfTasks,
        });

        // for each feature, we need to generate tickets
        for (const feature of featuresBreakdown.response.feature) {
            const featureXml = formatXml(feature);

            // generate ticket for each feature
            const ticketRequest: CodingTaskRequest = {
                taskId: `${taskId}-${current + 1}`,
                owner,
                repo,
                branch,
                task: feature.description,
                model,
                files: [],
                params: {
                    technicalDesignDoc: tddContent,
                    featureForJira: featureXml,
                },
            };

            sendTaskUpdate(
                taskId,
                "progress",
                `Generating Jira tickets for Feature: ${feature.name}...`
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

            sendTaskUpdate(taskId, "complete", tickets.response);
            this.emitMetrics(taskId, tickets);
            totalCost += tickets.cost;

            sendTaskUpdate(taskId, "tasks-progress", {
                current: ++current,
                numberOfTasks,
            });
        }

        sendTaskUpdate(taskId, "progress", `Total Cost: $${totalCost.toFixed(6)}`);

        const endTime = new Date().getTime();
        sendTaskUpdate(taskId, "progress", `Time taken: ${displayTime(startTime, endTime)}`);
    }

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
