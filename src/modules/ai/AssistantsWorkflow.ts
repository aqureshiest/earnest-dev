import { CodingAssistant } from "./assistants/CodingAssistant";
import { PlannerAssistant } from "./assistants/PlannerAssistant";
import { SpecificationsAssistant } from "./assistants/SpecificationsAssistant";

export class AssistantsWorkflow {
    private specificationsAssistant: SpecificationsAssistant;
    private plannerAssistant: PlannerAssistant;
    private codingAssistant: CodingAssistant;

    constructor() {
        this.specificationsAssistant = new SpecificationsAssistant();
        this.plannerAssistant = new PlannerAssistant();
        this.codingAssistant = new CodingAssistant();
    }

    async runWorkflow(
        model: string,
        task: string,
        files: FileDetails[],
        params?: any
    ): Promise<AIAssistantResponse<any> | null> {
        // generate specifications
        const specificationsResult = await this.specificationsAssistant.process({
            model,
            task,
            files,
            params,
        });

        if (!specificationsResult) {
            throw new Error("Specifications not generated.");
        }

        // generate plan
        const plannerResult = await this.plannerAssistant.process({
            model,
            task,
            files,
            params: {
                ...params,
                specifications: this.formatSpecifications(specificationsResult.response),
            },
        });

        if (!plannerResult) {
            throw new Error("Plan not generated.");
        }

        // generate code
        const codingResult = await this.codingAssistant.process({
            model,
            task,
            files,
            params: {
                ...params,
                implementationPlan: this.formatImplementationPlan(plannerResult.response),
            },
        });

        if (!codingResult) {
            throw new Error("Code not generated.");
        }

        return codingResult;
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
