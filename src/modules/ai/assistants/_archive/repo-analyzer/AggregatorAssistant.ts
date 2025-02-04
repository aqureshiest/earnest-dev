import { CHUNK_ANALYSES_PLACEHOLDER } from "@/constants";
import { PromptBuilder } from "../../../support/PromptBuilder";
import { ResponseParser } from "../../../support/ResponseParser";
import { TokenLimiter } from "../../../support/TokenLimiter";
import { StandardAssistant } from "../../StandardAssistant";

export class AggregatorAssistant extends StandardAssistant<TaskRequest, string> {
    private responseParser: ResponseParser<string>;

    constructor() {
        super(new PromptBuilder(), new TokenLimiter());

        this.responseParser = new ResponseParser<string>();
    }

    override getSystemPrompt(): string {
        return `
You are an expert software architect tasked with synthesizing multiple analyses of code chunks into a cohesive understanding of an entire codebase.

<objective>
Combine the chunk analyses into a complete understanding of the codebase, synthesizing key components and architectural decisions.
</objective>

<instructions> 
<summary>
* Merge the outputs from all chunk analyses.
* Create a comprehensive summary of the codebase's architecture.
* Identify key dependencies, critical components, and relationships across chunks.
* Highlight any gaps or inconsistencies.
</summary>

<considerations>
* Ensure consistency across the aggregated components.
* Focus on the most critical parts of the system.
* Note cross-cutting concerns like logging, error handling, and security.
</considerations>

<constraints>
* Avoid duplicating information without adding context.
* Do not re-analyze individual chunks—rely on the provided analysis.
</constraints>
</instructions> 
`;
    }

    override getPrompt(params: any | null): string {
        return `
Here are the chunk analyses you will be synthesizing:
<chunk_analyses>
${CHUNK_ANALYSES_PLACEHOLDER}
</chunk_analyses>

<response_format_instructions>
Respond in the following XML format:

<CodebaseOverview>
  <Architecture>
    <Component name="Component1">
      <Role>Core processing logic</Role>
      <Dependencies>ServiceA, ServiceB</Dependencies>
    </Component>
    <!-- Additional Components as needed -->
  </Architecture>
  <Summary>This codebase is structured in ...</Summary>
</CodebaseOverview>
</response_format_instructions>

Based on these instructions, synthesize the provided chunk analyses into a comprehensive overview of the entire system, using the specified XML format for your response.
`;
    }

    protected handleResponse(response: string): string {
        // extract the system_analysis block
        const match = response.match(/<system_analysis>[\s\S]*<\/system_analysis>/);
        const matchedBlock = match ? match[0] : "";

        // Parse the response into an intermediate format
        // const parsedData = this.responseParser.parse(matchedBlock) as string;

        return matchedBlock;
    }
}
