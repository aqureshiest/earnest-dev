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
Create a comprehensive overview of the full software system by integrating and synthesizing the analyses of individual code chunks.
</objective>

<instructions>
<summary>
* Combine the primary functionalities identified across all chunks into a unified set of system features
* Aggregate all key components and their responsibilities, identifying any overlaps or relationships between components from different chunks
* Synthesize the architectural patterns observed to infer the overall system architecture
* Compile a complete list of APIs (both internal and external) used throughout the system
* Integrate all data models into a cohesive data architecture
* Synthesize the business logic and processes identified across chunks into a comprehensive understanding of the system's core operations
* Consolidate the cross-cutting concerns identified in various chunks
* Identify any potential gaps or inconsistencies in the overall system based on the aggregated information
</summary>

<considerations>
* Look for patterns and relationships between components and functionalities across different chunks
* Infer the overall system structure and data flow based on the interactions between components
* Consider how the various APIs might be used to integrate different parts of the system
* Pay attention to recurring themes or approaches in business logic and cross-cutting concerns
* Be aware that some components or functionalities might be mentioned in multiple chunk analyses - consolidate these appropriately
</considerations>

<constraints>
* Avoid making assumptions about parts of the system that are not evidenced in any of the chunk analyses
* Do not attempt to fill in gaps with speculative information
* Refrain from critiquing the overall system design or suggesting improvements
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

<system_analysis>
  <system_overview>
    <primary_functionalities>
      <functionality>
        <name></name>
        <description></description>
        <key_components></key_components>
      </functionality>
      <!-- Repeat for each main functionality of the entire system -->
    </primary_functionalities>
    <overall_architecture>
      <description></description>
      <key_patterns></key_patterns>
    </overall_architecture>
  </system_overview>
  
  <component_architecture>
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
    <!-- Repeat for each significant component in the system -->
  </component_architecture>
  
  <api_landscape>
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
    <!-- Repeat for each API in the system -->
  </api_landscape>
  
  <data_architecture>
    <data_model>
      <name></name>
      <purpose></purpose>
      <key_attributes></key_attributes>
      <relationships>
        <relationship>
          <with></with>
          <type></type>
        </relationship>
        <!-- Repeat for each significant relationship -->
      </relationships>
    </data_model>
    <!-- Repeat for each significant data model in the system -->
  </data_architecture>
  
  <core_business_processes>
    <process>
      <name></name>
      <description></description>
      <key_steps></key_steps>
      <involved_components></involved_components>
    </process>
    <!-- Repeat for each core business process in the system -->
  </core_business_processes>
  
  <cross_cutting_concerns>
    <concern>
      <type></type>
      <system_wide_approach></system_wide_approach>
    </concern>
    <!-- Repeat for each cross-cutting concern across the system -->
  </cross_cutting_concerns>
  
  <potential_gaps_inconsistencies>
    <item>
      <description></description>
      <affected_areas></affected_areas>
    </item>
    <!-- List any potential gaps or inconsistencies identified during synthesis -->
  </potential_gaps_inconsistencies>
</system_analysis>
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
