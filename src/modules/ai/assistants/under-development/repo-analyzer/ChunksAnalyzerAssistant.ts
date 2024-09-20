import { CODEFILES_PLACEHOLDER } from "@/constants";
import { PromptBuilder } from "../../../support/PromptBuilder";
import { ResponseParser } from "../../../support/ResponseParser";
import { TokenLimiter } from "../../../support/TokenLimiter";
import { CodebaseChunksAssistant } from "../../CodebaseChunksAssistant";

export class ChunksAnalyzerAssistant extends CodebaseChunksAssistant<string> {
    private responseParser: ResponseParser<string>;

    constructor() {
        super(new PromptBuilder(), new TokenLimiter());

        this.responseParser = new ResponseParser<string>();
    }

    override getSystemPrompt(): string {
        return `
You are an expert software engineer analyzing a chunk of an existing codebase to understand its core functionalities and architecture.

<objective>
Extract a high-level understanding of the main functionalities, key components, and architectural elements represented in the provided code chunk.
</objective>

<instructions>
<summary>
* Identify the primary functionalities or features in this code chunk
* Recognize key components or modules and their responsibilities
* Determine how these components interact to deliver the identified functionalities
* Identify any APIs (internal and external) present in the chunk
* Detect important data models or structures
* Recognize any evident architectural patterns or design principles
* Identify cross-cutting concerns (e.g., logging, error handling, security)
* Note any significant business logic or domain-specific algorithms
</summary>

<considerations>
* Focus on understanding the overall purpose and functionality rather than implementation details
* Consider how the identified components work together in the context of this chunk
* Look for patterns in component interactions and communication
* Use naming conventions and code organization as clues about the system's structure
</considerations>

<constraints>
* Avoid deep dives into specific implementation details unless crucial for understanding key functionalities
* Do not make assumptions about functionalities or components not evidenced in this code chunk
* Refrain from critiquing the implementation or suggesting improvements
</constraints>
</instructions>
`;
    }

    override getPrompt(params: any | null): string {
        return `
Here are the existing code files you will be working with:
<existing_codebase>
${CODEFILES_PLACEHOLDER}
</existing_codebase>

<response_format_instructions>
Respond in the following XML format:

<chunk_analysis>
  <overview>
    <primary_functionalities>
      <functionality>
        <name></name>
        <description></description>
        <key_components></key_components>
      </functionality>
      <!-- Repeat for each main functionality identified -->
    </primary_functionalities>
    <architectural_patterns></architectural_patterns>
  </overview>
  
  <key_components>
    <component>
      <name></name>
      <type>service/module/class/etc</type>
      <responsibility></responsibility>
      <key_interactions>
        <interaction>
          <with></with>
          <purpose></purpose>
        </interaction>
        <!-- Repeat for significant interactions -->
      </key_interactions>
    </component>
    <!-- Repeat for each significant component identified -->
  </key_components>
  
  <apis>
    <api>
      <name></name>
      <type>internal/external</type>
      <purpose></purpose>
      <key_endpoints>
        <endpoint>
          <path></path>
          <method></method>
          <functionality></functionality>
        </endpoint>
        <!-- Repeat for key endpoints -->
      </key_endpoints>
    </api>
    <!-- Repeat for each significant API identified -->
  </apis>
  
  <data_models>
    <model>
      <name></name>
      <purpose></purpose>
      <key_attributes></key_attributes>
    </model>
    <!-- Repeat for each significant data model -->
  </data_models>
  
  <business_logic>
    <process>
      <name></name>
      <description></description>
    </process>
    <!-- Repeat for each significant business process or algorithm -->
  </business_logic>
  
  <cross_cutting_concerns>
    <concern>
      <type>logging/security/error handling/etc</type>
      <implementation_approach></implementation_approach>
    </concern>
    <!-- Repeat for each cross-cutting concern identified -->
  </cross_cutting_concerns>
</chunk_analysis>
</response_format_instructions>

Based on these instructions, analyze the provided code chunk and deliver a concise, high-level understanding of its functionalities, key components, and architectural elements in the specified XML format.
`;
    }

    protected aggregateResponses(responses: string[]): string {
        return responses.join("\n");
    }

    protected handleResponse(response: string): string {
        // extract the chunk_analysis block
        const match = response.match(/<chunk_analysis>[\s\S]*<\/chunk_analysis>/);
        const matchedBlock = match ? match[0] : "";

        // Parse the response into an intermediate format
        // const parsedData = this.responseParser.parse(matchedBlock) as string;

        return matchedBlock;
    }
}
