import { WriterAssistant } from "@/modules/ai/assistants/generate-code/WriterAssistant";
import { sendTaskUpdate } from "../utils/sendTaskUpdate";

export class GeneratePR {
    private writerAssistant: WriterAssistant;

    private taskId: string;

    constructor(taskId: string) {
        this.writerAssistant = new WriterAssistant();

        this.taskId = taskId;
    }

    async runWorkflow(
        model: string,
        task: string,
        params?: any
    ): Promise<AIAssistantResponse<string>> {
        // make sure implementation plan and generated code are provided in the params
        if (!params || !params.implementationPlan || !params.generatedCode) {
            throw new Error("Implementation plan and generated code are required.");
        }

        sendTaskUpdate(this.taskId, "start", { assistant: "PR" });
        sendTaskUpdate(this.taskId, "progress", "Generating PR...");
        // write PR description
        const prDescription = await this.writerAssistant.process({
            model,
            task,
            files: [], // no existing codebase files needed for writing PR
            params,
        });

        if (!prDescription) {
            throw new Error("PR description not generated.");
        }

        sendTaskUpdate(this.taskId, "complete", { assistant: "PR", response: "" });
        await this.emitMetrics(prDescription);

        return prDescription;
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
