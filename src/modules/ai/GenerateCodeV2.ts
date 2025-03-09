import { CodeGenMetricsService } from "../metrics/generate/CodeGenMetricsService";
import { displayTime } from "../utils/displayTime";
import { sendTaskUpdate } from "../utils/sendTaskUpdate";
import { CodingAssistantProcessByStep } from "./assistants/generate-code/CodingAssistantProcessByStep";
import { PlannerAssistantV2 } from "./assistants/generate-code/PlannerAssistantV2";

export class GenerateCodeV2 {
    private plannerAssistant: PlannerAssistantV2;
    private codingAssistant: CodingAssistantProcessByStep;

    constructor() {
        this.plannerAssistant = new PlannerAssistantV2();
        this.codingAssistant = new CodingAssistantProcessByStep();
    }

    async runWorkflow(taskRequest: CodingTaskRequest): Promise<AIAssistantResponse<CodeChanges>> {
        const { taskId, owner, repo, params } = taskRequest;

        const metricsService = new CodeGenMetricsService();

        // track start time
        const startTime = new Date().getTime();

        sendTaskUpdate(taskId, "start", { assistant: "planning" });
        sendTaskUpdate(taskId, "progress", "Generating implementation plan...");

        // generate plan
        const plan = await this.plannerAssistant.process(taskRequest);

        if (!plan) {
            throw new Error("Plan not generated.");
        }

        // add plan to request params
        params.implementationPlan = plan.response;

        await this.emitMetrics(taskId, plan);
        sendTaskUpdate(taskId, "complete", { assistant: "planning", response: plan });

        // Track implementation plan steps
        const stepCount = plan.response?.steps?.length || 0;
        await metricsService.trackImplementationSteps({
            owner,
            repo,
            stepCount,
            completedSteps: 0,
        }); // Initially 0 completed

        sendTaskUpdate(taskId, "start", { assistant: "code" });
        sendTaskUpdate(taskId, "progress", "Generating code...");

        // generate code
        const code = await this.codingAssistant.process(taskRequest);

        if (!code || !code.response) {
            throw new Error("Code not generated.");
        }

        await this.emitMetrics(taskId, code);
        sendTaskUpdate(taskId, "complete", { assistant: "code", response: code });

        // Track implementation plan steps completion
        await metricsService.trackImplementationSteps({
            owner,
            repo,
            stepCount,
            completedSteps: stepCount,
        }); // All steps completed

        // Track code generation metrics
        await this.trackCodeGenerationMetrics(metricsService, code.response, owner, repo);

        // calculate total cost
        const totalCost = plan.cost + code.cost;
        sendTaskUpdate(taskId, "progress", `Total Cost: $${totalCost.toFixed(6)}`);
        // Track token usage across both assistants
        await metricsService.trackTokenUsage({
            owner,
            repo,
            inputTokens: plan.inputTokens + code.inputTokens,
            outputTokens: plan.outputTokens + code.outputTokens,
            cost: totalCost,
        });

        // report time taken
        const endTime = new Date().getTime();
        sendTaskUpdate(taskId, "progress", `Time taken: ${displayTime(startTime, endTime)}`);

        // send metrics
        const totalDuration = endTime - startTime;
        await metricsService.trackDuration({ owner, repo }, totalDuration);

        return code;
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

    private async trackCodeGenerationMetrics(
        metricsService: CodeGenMetricsService,
        codeChanges: CodeChanges,
        owner: string,
        repo: string
    ) {
        // Count file operations
        const newFilesCount = codeChanges.newFiles?.length || 0;
        const modifiedFilesCount = codeChanges.modifiedFiles?.length || 0;
        const deletedFilesCount = codeChanges.deletedFiles?.length || 0;

        // Calculate lines of code
        let totalLinesOfCode = 0;

        // Count lines in new files
        for (const file of codeChanges.newFiles || []) {
            if (file.content) {
                totalLinesOfCode += file.content.split("\n").length;
            }
        }

        // Count lines in modified files
        for (const file of codeChanges.modifiedFiles || []) {
            if (file.content) {
                totalLinesOfCode += file.content.split("\n").length;
            }
        }

        // Track the metrics
        await metricsService.trackCodeGeneration({
            owner,
            repo,
            linesOfCode: totalLinesOfCode,
            newFiles: newFilesCount,
            modifiedFiles: modifiedFilesCount,
            deletedFiles: deletedFilesCount,
        });
    }
}
