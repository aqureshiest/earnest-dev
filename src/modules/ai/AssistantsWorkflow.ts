import { displayTime } from "../utilities/displayTime";
import { CodingAssistant } from "./assistants/CodingAssistant";
import { PlannerAssistant } from "./assistants/PlannerAssistant";
import { SpecificationsAssistant } from "./assistants/SpecificationsAssistant";

interface WorkflowResponse {
    specs: AIAssistantResponse<Specifications>;
    plan: AIAssistantResponse<ImplementationPlan>;
    code: AIAssistantResponse<CodeChanges>;
}

export class AssistantsWorkflow {
    private specificationsAssistant: SpecificationsAssistant;
    private plannerAssistant: PlannerAssistant;
    private codingAssistant: CodingAssistant;

    private updatesChannel: any;

    constructor(updatesChannel: any) {
        this.specificationsAssistant = new SpecificationsAssistant();
        this.plannerAssistant = new PlannerAssistant();
        this.codingAssistant = new CodingAssistant();

        this.updatesChannel = updatesChannel;
    }

    async runWorkflow(
        model: string,
        task: string,
        files: FileDetails[],
        params?: any
    ): Promise<WorkflowResponse | null> {
        // track start time
        const startTime = new Date().getTime();

        await this.updatesChannel.publish("overall", "Generating specifications...");
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
        await this.updatesChannel.publish("specifications", specs);

        await this.updatesChannel.publish("overall", "Generating implementation plan...");
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
        await this.updatesChannel.publish("implementationplan", plan);

        await this.updatesChannel.publish("overall", "Generating code...");

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

        // calculate total cost
        const totalCost = specs.cost + plan.cost + code.cost;
        await this.updatesChannel.publish("overall", `Total Cost: $${totalCost.toFixed(6)}`);

        // report time taken
        const endTime = new Date().getTime();
        await this.updatesChannel.publish(
            "overall",
            `Time taken: ${displayTime(startTime, endTime)}`
        );

        return { specs, plan, code };
    }

    private async emitMetrics(result: AIAssistantResponse<any>) {
        await this.updatesChannel.publish(
            "overall",
            `*Approximated tokens: ${result.calculatedTokens}`
        );
        await this.updatesChannel.publish("overall", `*Actual Input tokens: ${result.inputTokens}`);
        await this.updatesChannel.publish(
            "overall",
            `*Actual Output tokens: ${result.outputTokens}`
        );
        await this.updatesChannel.publish("overall", `*Cost: $${result.cost.toFixed(6)}`);
    }
}
