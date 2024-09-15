import { CHUNK_ANALYSES_PLACEHOLDER } from "@/constants";
import { PromptBuilder } from "../../support/PromptBuilder";
import { ResponseParser } from "../../support/ResponseParser";
import { TokenLimiter } from "../../support/TokenLimiter";
import { StandardAssistant } from "../StandardAssistant";

export class AggregatorAssistant extends StandardAssistant<TaskRequest, string> {
    private responseParser: ResponseParser<string>;

    constructor() {
        super(new PromptBuilder(), new TokenLimiter());

        this.responseParser = new ResponseParser<string>();
    }

    override getSystemPrompt(): string {
        return `
You are an expert software architect tasked with synthesizing information from multiple code chunk analyses to provide a comprehensive understanding of an entire codebase.

<objective>
Analyze the provided chunk analyses and create a cohesive overview of the entire codebase, focusing on its overall architecture, main features, key design patterns, and potential areas for improvement or extension.
</objective>

<instructions>
**Focus on**:
- Identifying the overarching purpose and main features of the application
- Summarizing the overall architecture and key technical decisions
- Highlighting important design patterns and their application across the codebase
- Recognizing relationships and dependencies between different parts of the system
- Identifying potential areas for improvement, optimization, or extension
- Providing insights that would be valuable for both new developers and for future planning

**When analyzing**:
- Look for common themes and patterns across chunk analyses
- Resolve any contradictions or inconsistencies between analyses
- Prioritize information that contributes to understanding the system as a whole
- Consider how different components interact and support the overall functionality

**Avoid**:
- Excessive detail about individual components unless critically important
- Repeating information without adding new insights
- Making assumptions about functionality not explicitly mentioned in the analyses
</instructions>
`;
    }

    override getPrompt(params: any | null): string {
        return `
Here is the detailed analysis of each code chunk:
<chunk_analyses>
${CHUNK_ANALYSES_PLACEHOLDER}
</chunk_analyses>

<response_format_instructions>
Respond in the following format:

<codebase_analysis>
	<project_overview>
		<main_purpose>Describe the overall purpose and primary functionality of the application</main_purpose>
		<key_features>
			<feature>
				<name>Name of a key feature</name>
				<description>Brief description of the feature and its importance</description>
			</feature>
			<!-- Repeat for 3-5 key features -->
		</key_features>
	</project_overview>
	<architecture_summary>
		<description>Summarize the overall architecture of the application</description>
		<key_components>
			<component>
				<name>Name of a major component or subsystem</name>
				<role>Brief description of its role in the overall system</role>
			</component>
			<!-- Repeat for each major component -->
		</key_components>
		<notable_patterns>
			<pattern>
				<name>Name of a notable design pattern or architectural decision</name>
				<application>How and where it's applied in the codebase</application>
				<impact>Its impact on the system's functionality or performance</impact>
			</pattern>
			<!-- Repeat for 2-3 notable patterns -->
		</notable_patterns>
	</architecture_summary>
	<technical_highlights>
		<highlight>
			<description>Description of a significant technical aspect or decision</description>
			<implication>Its implications for the project's functionality, scalability, or maintainability</implication>
		</highlight>
		<!-- Repeat for 2-3 technical highlights -->
	</technical_highlights>
	<integration_points>
		<point>
			<description>Description of a key integration point or external dependency</description>
			<purpose>Its purpose and importance in the system</purpose>
		</point>
		<!-- Repeat for each significant integration point -->
	</integration_points>
	<areas_for_improvement>
		<area>
			<description>Description of an area that could be improved or extended</description>
			<rationale>Reason for suggesting this improvement</rationale>
		</area>
		<!-- Repeat for 2-3 areas -->
	</areas_for_improvement>
	<developer_insights>
		<insight>Provide a valuable insight for developers working with or maintaining this codebase</insight>
		<!-- Include 2-3 insights -->
	</developer_insights>
</codebase_analysis>

</response_format_instructions>

Now, Analyze the provided chunk analyses and respond using this format, focusing on providing a comprehensive understanding of the entire codebase.
`;
    }

    protected handleResponse(response: string): string {
        // extract the codebase_analysis block
        const match = response.match(/<codebase_analysis>[\s\S]*<\/codebase_analysis>/);
        const matchedBlock = match ? match[0] : "";

        // Parse the response into an intermediate format
        const parsedData = this.responseParser.parse(matchedBlock) as string;

        return parsedData;
    }
}
