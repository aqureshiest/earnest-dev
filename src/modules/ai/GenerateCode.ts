import { displayTime } from "../utils/displayTime";
import { CodingAssistant } from "@/modules/ai/assistants/generate-code/CodingAssistant";
import { PlannerAssistant } from "@/modules/ai/assistants/generate-code/PlannerAssistant";
import { SpecificationsAssistant } from "@/modules/ai/assistants/generate-code/SpecificationsAssistant";
import { sendTaskUpdate } from "../utils/sendTaskUpdate";

export class GenerateCode {
    private specificationsAssistant: SpecificationsAssistant;
    private plannerAssistant: PlannerAssistant;
    private codingAssistant: CodingAssistant;

    private taskId: string;

    constructor(taskId: string) {
        this.specificationsAssistant = new SpecificationsAssistant();
        this.plannerAssistant = new PlannerAssistant();
        this.codingAssistant = new CodingAssistant();

        this.taskId = taskId;
    }

    async runWorkflow(
        model: string,
        task: string,
        files: FileDetails[],
        params?: any
    ): Promise<AIAssistantResponse<CodeChanges>> {
        // track start time
        const startTime = new Date().getTime();

        sendTaskUpdate(this.taskId, "start", { assistant: "specifications" });
        sendTaskUpdate(this.taskId, "progress", "Generating specifications...");

        // generate specifications
        const specs = await this.specificationsAssistant.process({
            model,
            task,
            files,
            params,
        });

        if (!specs) {
            throw new Error("Specifications not generated.");
        }

        await this.emitMetrics(specs);
        sendTaskUpdate(this.taskId, "complete", { assistant: "specifications", response: specs });

        sendTaskUpdate(this.taskId, "start", { assistant: "planning" });
        sendTaskUpdate(this.taskId, "progress", "Generating implementation plan...");

        // generate plan
        const plan = await this.plannerAssistant.process({
            model,
            task,
            files,
            params: {
                ...params,
                specifications: specs.responseStr,
            },
        });

        if (!plan) {
            throw new Error("Plan not generated.");
        }

        await this.emitMetrics(plan);
        sendTaskUpdate(this.taskId, "complete", { assistant: "planning", response: plan });

        sendTaskUpdate(this.taskId, "start", { assistant: "code" });
        sendTaskUpdate(this.taskId, "progress", "Generating code...");

        // generate code
        const code = await this.codingAssistant.process({
            model,
            task,
            files,
            params: {
                ...params,
                implementationPlan: plan.responseStr,
            },
        });

        if (!code) {
            throw new Error("Code not generated.");
        }

        await this.emitMetrics(code);
        sendTaskUpdate(this.taskId, "complete", { assistant: "code", response: code });

        // calculate total cost
        const totalCost = specs.cost + plan.cost + code.cost;
        sendTaskUpdate(this.taskId, "progress", `Total Cost: $${totalCost.toFixed(6)}`);

        // report time taken
        const endTime = new Date().getTime();
        sendTaskUpdate(this.taskId, "progress", `Time taken: ${displayTime(startTime, endTime)}`);

        return code;
    }

    private async emitMetrics(result: AIAssistantResponse<any>) {
        sendTaskUpdate(
            this.taskId,
            "progress",
            `*Approximated tokens: ${result.calculatedTokens.toFixed(0)}`
        );
        sendTaskUpdate(this.taskId, "progress", `*Actual Input tokens: ${result.inputTokens}`);
        sendTaskUpdate(this.taskId, "progress", `*Actual Output tokens: ${result.outputTokens}`);
        sendTaskUpdate(this.taskId, "progress", `*Cost: $${result.cost.toFixed(6)}`);
    }
}
