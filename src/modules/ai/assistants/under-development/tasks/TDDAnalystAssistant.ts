import { TECHNICAL_DESIGN_DOC_PLACEHOLDER } from "@/constants";
import { StandardAssistant } from "../../StandardAssistant";
import { PromptBuilder } from "@/modules/ai/support/PromptBuilder";
import { ResponseParser } from "@/modules/ai/support/ResponseParser";
import { TokenLimiter } from "@/modules/ai/support/TokenLimiter";

export class TDDAnalystAssistant extends StandardAssistant<TaskRequest, TDDAnalysis> {
    private responseParser: ResponseParser<string>;

    constructor() {
        super(new PromptBuilder(), new TokenLimiter());

        this.responseParser = new ResponseParser<string>();
    }

    getSystemPrompt(): string {
        return `
You are an expert software architect analyzing a technical design document.

<objective>
Analyze the provided Technical Design Document (TDD) to extract key information and derive detailed, actionable tasks for implementation. Focus on creating a comprehensive breakdown of the project, its components, and the specific tasks required for each feature.
</objective>

<instructions>
1. Thoroughly read and analyze the provided Technical Design Document.
2. Identify the main project objectives and key components of the system.
3. For each major feature or modification outlined in the TDD:
   a. Break it down into smaller, concrete tasks.
   b. Specify technical details crucial for implementation, including but not limited to:
      - API endpoints, request/response payloads, and authentication methods
      - Database schema changes, including new tables, columns, and relationships
      - Any specific technical strategies and implementation methods
      - Integration details with external services or components
   c. Note any dependencies on existing components or other tasks.
   d. Estimate the complexity of each task (Low/Medium/High).
4. Identify potential challenges or risks associated with the implementation.
5. List any additional considerations or recommendations for the project.
6. Ensure all tasks are actionable and implementation-ready, providing sufficient detail for developers to begin work immediately.
</instructions>

<considerations>
- Consider the interdependencies between components and tasks, ensuring a logical implementation order.
- Evaluate how each task contributes to the overall system architecture and project objectives.
- Assess potential impacts on system performance, scalability, and maintainability.
- Consider any security implications or compliance requirements that may not be explicitly stated in the TDD.
- Identify any areas where additional clarification or information might be needed from stakeholders.
</considerations>

<constraints>
- Stick to the information provided in the TDD. Do not assume additional requirements or existing implementations unless clearly implied in the document.
- Provide specific technical details for tasks, but avoid prescribing exact implementation methods unless specified in the TDD.
- Ensure all identified tasks align with the overall architecture and objectives described in the TDD.
</constraints>

`;
    }
    getPrompt(params?: any): string {
        return `
Here is the technical design document (TDD) you will be analyzing:
<technical_design_document>
${TECHNICAL_DESIGN_DOC_PLACEHOLDER}
</technical_design_document>

<response_format_instructions>
Respond in the following XML format:

	<TDDAnalysis>
		<Overview>
			<ProjectSummary>[Brief summary of the project, including its main purpose and goals]</ProjectSummary>
			<MainObjectives>
				<Objective>[Objective 1]</Objective>
				<Objective>[Objective 2]</Objective>
				<!-- Add more objectives as needed -->
			</MainObjectives>
		</Overview>
		<KeyComponents>
			<Component>
				<Name>[Component Name]</Name>
				<Description>[Brief description of the component, its role in the system, and how it relates to the tasks]</Description>
			</Component>
			<!-- Add more components as needed -->
		</KeyComponents>
		<DetailedTasks>
			<Feature>
				<Name>[Feature Name]</Name>
				<Description>[Brief description of the feature]</Description>
				<Tasks>
					<Task>
						<Name>[Task Name]</Name>
						<Description>[Detailed description of the task]</Description>
						<TechnicalDetails>
							<Detail>[Specific technical information needed for implementation, e.g., API endpoint details, database schema changes, caching strategies]</Detail>
							<!-- Add more details as needed -->
						</TechnicalDetails>
						<Dependencies>[Any dependencies on other components or tasks]</Dependencies>
						<EstimatedComplexity>[Low/Medium/High]</EstimatedComplexity>
					</Task>
					<!-- Add more tasks as needed -->
				</Tasks>
			</Feature>
			<!-- Add more features as needed -->
		</DetailedTasks>
		<PotentialChallengesAndRisks>
			<Item>
				<Description>[Description of the challenge or risk]</Description>
				<Mitigation>[Suggested mitigation strategy or consideration]</Mitigation>
			</Item>
			<!-- Add more items as needed -->
		</PotentialChallengesAndRisks>
		<AdditionalConsiderations>
			<Item>[Any other relevant information, recommendations, or considerations for the project]</Item>
			<!-- Add more items as needed -->
		</AdditionalConsiderations>
	</TDDAnalysis>
</response_format_instructions>

Now, using the provided TDD, analyze the project, extract key information, and derive detailed, actionable tasks for implementation in the specified XML format.
`;
    }
    protected handleResponse(response: string): TDDAnalysis {
        // extract the TDDAnalysis block
        const match = response.match(/<TDDAnalysis>[\s\S]*<\/TDDAnalysis>/);
        const matchedBlock = match ? match[0] : "";

        // Parse the response into an intermediate format
        const parsedData = this.responseParser.parse(matchedBlock) as any;

        const result = parsedData.TDDAnalysis;
        return {
            overview: {
                projectSummary: result.Overview.ProjectSummary,
                mainObjectives: result.Overview.MainObjectives.Objective,
            },
            keyComponents: result.KeyComponents.Component.map((component: any) => ({
                name: component.Name,
                description: component.Description,
            })),
            detailedTasks: result.DetailedTasks.Feature.map((feature: any) => ({
                name: feature.Name,
                description: feature.Description,
                tasks: feature.Tasks.Task.map((task: any) => ({
                    name: task.Name,
                    description: task.Description,
                    technicalDetails: task.TechnicalDetails.Detail,
                    dependencies: task.Dependencies,
                    estimatedComplexity: task.EstimatedComplexity,
                })),
            })),
            potentialChallengesAndRisks: result.PotentialChallengesAndRisks.Item.map(
                (item: any) => ({
                    description: item.Description,
                    mitigation: item.Mitigation,
                })
            ),
            additionalConsiderations: result.AdditionalConsiderations.Item,
        };
    }
}
