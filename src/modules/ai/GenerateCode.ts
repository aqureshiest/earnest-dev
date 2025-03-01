import { displayTime } from "../utils/displayTime";
import { PlannerAssistant } from "@/modules/ai/assistants/generate-code/PlannerAssistant";
import { SpecificationsAssistant } from "@/modules/ai/assistants/generate-code/SpecificationsAssistant";
import { sendTaskUpdate } from "../utils/sendTaskUpdate";
import { CodingAssistant } from "./assistants/generate-code/CodingAssistant";

export class GenerateCode {
    private specificationsAssistant: SpecificationsAssistant;
    private plannerAssistant: PlannerAssistant;
    private codingAssistant: CodingAssistant;

    constructor() {
        this.specificationsAssistant = new SpecificationsAssistant();
        this.plannerAssistant = new PlannerAssistant();
        this.codingAssistant = new CodingAssistant();
    }

    async runWorkflow(taskRequest: CodingTaskRequest): Promise<AIAssistantResponse<CodeChanges>> {
        const { taskId, params } = taskRequest;

        // track start time
        const startTime = new Date().getTime();
        let totalCost = 0;

        if (params?.skipSpecifications) {
            sendTaskUpdate(taskId, "progress", "Skipping specifications generation...");
        } else {
            sendTaskUpdate(taskId, "start", { assistant: "specifications" });
            sendTaskUpdate(taskId, "progress", "Generating specifications...");

            // generate specifications
            const specs = await this.specificationsAssistant.process(taskRequest);

            if (!specs) {
                throw new Error("Specifications not generated.");
            }

            // add specifications to request params
            params.specifications = specs.responseStr;

            await this.emitMetrics(taskId, specs);
            sendTaskUpdate(taskId, "complete", { assistant: "specifications", response: specs });

            totalCost += specs.cost;
        }

        sendTaskUpdate(taskId, "start", { assistant: "planning" });
        sendTaskUpdate(taskId, "progress", "Generating implementation plan...");

        // generate plan
        const plan = await this.plannerAssistant.process(taskRequest);

        if (!plan) {
            throw new Error("Plan not generated.");
        }

        // add plan to request params
        params.implementationPlan = plan.responseStr;

        await this.emitMetrics(taskId, plan);
        sendTaskUpdate(taskId, "complete", { assistant: "planning", response: plan });

        totalCost += plan.cost;

        sendTaskUpdate(taskId, "start", { assistant: "code" });
        sendTaskUpdate(taskId, "progress", "Generating code...");

        // generate code
        const code = await this.codingAssistant.process(taskRequest);

        if (!code) {
            throw new Error("Code not generated.");
        }

        await this.emitMetrics(taskId, code);
        sendTaskUpdate(taskId, "complete", { assistant: "code", response: code });

        totalCost += code.cost;

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
