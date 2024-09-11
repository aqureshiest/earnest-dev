import { WriterAssistant } from "@/modules/ai/assistants/generate-code/WriterAssistant";
import { sendTaskUpdate } from "../utils/sendTaskUpdate";

export class GeneratePR {
    private writerAssistant: WriterAssistant;

    constructor() {
        this.writerAssistant = new WriterAssistant();
    }

    async runWorkflow(taskRequest: CodingTaskRequest): Promise<AIAssistantResponse<string>> {
        const { taskId, params } = taskRequest;

        // make sure implementation plan and generated code are provided in the params
        if (!params || !params.implementationPlan || !params.generatedCode) {
            throw new Error("Implementation plan and generated code are required.");
        }

        sendTaskUpdate(taskId, "start", { assistant: "PR" });
        sendTaskUpdate(taskId, "progress", "Generating PR...");

        // write PR description
        const prDescription = await this.writerAssistant.process(taskRequest);

        if (!prDescription) {
            throw new Error("PR description not generated.");
        }

        sendTaskUpdate(taskId, "complete", { assistant: "PR", response: "" });
        await this.emitMetrics(taskId, prDescription);

        return prDescription;
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
