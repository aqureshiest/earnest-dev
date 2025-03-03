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
        const { taskId } = taskRequest;

        // track start time
        const startTime = new Date().getTime();

        const { params } = taskRequest;

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

        sendTaskUpdate(taskId, "start", { assistant: "code" });
        sendTaskUpdate(taskId, "progress", "Generating code...");

        // generate code
        const code = await this.codingAssistant.process(taskRequest);

        if (!code) {
            throw new Error("Code not generated.");
        }

        await this.emitMetrics(taskId, code);
        sendTaskUpdate(taskId, "complete", { assistant: "code", response: code });

        // calculate total cost
        const totalCost = plan.cost + code.cost;
        sendTaskUpdate(taskId, "progress", `Total Cost: $${totalCost.toFixed(6)}`);

        // report time taken
        const endTime = new Date().getTime();
        sendTaskUpdate(taskId, "progress", `Time taken: ${displayTime(startTime, endTime)}`);

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
}
