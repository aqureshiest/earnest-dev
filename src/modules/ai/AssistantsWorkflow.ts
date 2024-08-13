import { CodingAssistant } from "./assistants/CodingAssistant";
import { PlannerAssistant } from "./assistants/PlannerAssistant";
import { SpecificationsAssistant } from "./assistants/SpecificationsAssistant";

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
    ): Promise<AIAssistantResponse<any> | null> {
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
                specifications: this.formatSpecifications(specs.response),
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
                implementationPlan: this.formatImplementationPlan(plan.response),
            },
        });

        if (!code) {
            throw new Error("Code not generated.");
        }

        await this.emitMetrics(code);

        return code;
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

    private formatSpecifications(specifications: Specifications): string {
        return specifications.specifications
            .map(
                (spec, index) =>
                    `#### Specification #${index + 1}: ${spec.title}\n\n#### Consideration:\n${
                        spec.thoughts
                    }\n\n#### Details:\n${spec.specification}`
            )
            .join("\n");
    }

    private formatImplementationPlan(implementationPlan: ImplementationPlan): string {
        return implementationPlan.implementationPlan
            .map(
                (step, index) =>
                    `#### Step #${index + 1}: ${step.step}\n\n#### Thoughts:\n${
                        step.thoughts
                    }\n\n#### Files:\n${step.files.map(
                        (file) =>
                            `File: ${file.path}\nStatus: ${file.status}\nTodos:\n${this.formatTodos(
                                file.todos
                            )}`
                    )}`
            )
            .join("\n\n");
    }

    private formatTodos(todos: string[]): string {
        return todos.map((todo, index) => `- ${todo}`).join("\n");
    }
}
