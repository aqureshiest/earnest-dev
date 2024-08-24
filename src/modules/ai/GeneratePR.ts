import { WriterAssistant } from "./assistants/WriterAssistant";

export class GeneratePR {
    private writerAssistant: WriterAssistant;

    private updatesChannel: any;

    constructor(updatesChannel: any) {
        this.writerAssistant = new WriterAssistant();

        this.updatesChannel = updatesChannel;
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

        await this.updatesChannel.publish("overall", "Generating PR...");
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

        await this.emitMetrics(prDescription);

        return prDescription;
    }

    private async emitMetrics(result: AIAssistantResponse<any>) {
        await this.updatesChannel.publish(
            "overall",
            `*Approximated tokens: ${result.calculatedTokens.toFixed(0)}`
        );
        await this.updatesChannel.publish("overall", `*Actual Input tokens: ${result.inputTokens}`);
        await this.updatesChannel.publish(
            "overall",
            `*Actual Output tokens: ${result.outputTokens}`
        );
        await this.updatesChannel.publish("overall", `*Cost: $${result.cost.toFixed(6)}`);
    }
}
