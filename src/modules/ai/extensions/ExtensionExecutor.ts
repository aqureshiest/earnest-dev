import { PrepareCodebase } from "../PrepareCodebase";
import { DynamicAssistant } from "./DynamicAssistant";
import { sendTaskUpdate } from "@/modules/utils/sendTaskUpdate";
import { displayTime } from "@/modules/utils/displayTime";
import { ExtensionConfig } from "../../../types/extension";

interface ExtensionRequest {
    taskId: string;
    extensionId: string;
    owner: string;
    repo: string;
    branch: string;
    model: string;
    config: ExtensionConfig;
    params?: Record<string, any>;
}

export class ExtensionExecutor {
    async execute(request: ExtensionRequest) {
        const startTime = new Date().getTime();
        let totalCost = 0;

        try {
            // Load extension configuration
            sendTaskUpdate(request.taskId, "progress", "Loading extension configuration...");

            // Create dynamic assistant
            const assistant = new DynamicAssistant(request.config);

            // Prepare codebase
            sendTaskUpdate(request.taskId, "progress", "Preparing codebase for analysis...");
            const prepareCodebase = new PrepareCodebase();
            const files = await prepareCodebase.prepare({
                ...request,
                task: request.config.name,
                files: [],
            });

            // Prepare analysis request
            const analysisRequest = {
                taskId: request.taskId,
                model: request.model,
                task: request.config.name,
                repo: request.repo,
                branch: request.branch,
                owner: request.owner,
                files,
                params: {
                    ...request.params,
                    model: request.model,
                },
            };

            // Run analysis
            sendTaskUpdate(request.taskId, "progress", "Running analysis...");
            const analysis = await assistant.process(analysisRequest);

            if (!analysis || !analysis.response) {
                throw new Error("Failed to generate analysis");
            }

            // Track costs
            totalCost += analysis.cost;

            // Send completion updates
            sendTaskUpdate(request.taskId, "progress", "Analysis completed successfully");
            sendTaskUpdate(request.taskId, "complete", {
                results: analysis.response,
            });

            // Emit metrics
            this.emitMetrics(request.taskId, analysis);

            const endTime = new Date().getTime();
            sendTaskUpdate(
                request.taskId,
                "progress",
                `Time taken: ${displayTime(startTime, endTime)}`
            );
            sendTaskUpdate(request.taskId, "progress", `Total Cost: $${totalCost.toFixed(6)}`);

            return analysis;
        } catch (error: any) {
            sendTaskUpdate(request.taskId, "error", `Analysis failed: ${error.message}`);
            throw error;
        }
    }

    private emitMetrics(taskId: string, result: any) {
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
