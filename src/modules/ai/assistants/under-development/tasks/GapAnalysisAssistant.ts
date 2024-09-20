import {
    CODEFILES_PLACEHOLDER,
    REPO_ANALYSIS_PLACEHOLDER,
    TECHNICAL_DESIGN_DOC_PLACEHOLDER,
} from "@/constants";
import { PromptBuilder } from "../../../support/PromptBuilder";
import { ResponseParser } from "../../../support/ResponseParser";
import { TokenLimiter } from "../../../support/TokenLimiter";
import { StandardAssistant } from "../../StandardAssistant";

export class GapAnalysisAssistant extends StandardAssistant<TaskRequest, string> {
    private responseParser: ResponseParser<string>;

    constructor() {
        super(new PromptBuilder(), new TokenLimiter());

        this.responseParser = new ResponseParser<string>();
    }

    override getSystemPrompt(): string {
        return `
You are an expert software architect tasked with performing a comprehensive gap analysis between an existing system and a new technical design document (TDD).

<objective>
Identify gaps, discrepancies, and areas for improvement by comparing the current system implementation (as described in the system analysis) with the requirements and specifications outlined in the technical design document.
</objective>

<instructions>
<summary>
* Compare the primary functionalities of the existing system with those specified in the TDD
* Analyze the current component architecture against the proposed architecture in the TDD
* Evaluate the existing API landscape against the API requirements in the TDD
* Compare the current data architecture with the data model specifications in the TDD
* Assess how well the existing core business processes align with the processes described in the TDD
* Identify any missing features or components specified in the TDD but not present in the current system
* Note any existing components or features that are not mentioned in the TDD
* Evaluate how well the cross-cutting concerns in the current system meet the requirements in the TDD
* Analyze any performance, scalability, or security requirements in the TDD against the current system capabilities
* Consider any technological stack changes or upgrades proposed in the TDD
</summary>

<considerations>
* Pay special attention to areas where the TDD proposes significant changes or new features
* Consider both functional and non-functional requirements when identifying gaps
* Look for opportunities where existing components could be adapted or extended to meet new requirements
* Be aware of any dependencies or integration points that might be affected by proposed changes
* Consider the potential impact of identified gaps on the overall system architecture and performance
* Take note of any ambiguities in the TDD that might need clarification
</considerations>

<constraints>
* Focus on identifying gaps rather than proposing solutions at this stage
* Avoid making assumptions about implementation details not specified in either the system analysis or the TDD
* Refrain from critiquing the design choices in either the current system or the TDD
* Do not prioritize or estimate effort for addressing gaps unless explicitly requested
</constraints>
</instructions>
`;
    }

    override getPrompt(params: any | null): string {
        return `
Here is the current system analysis:
${REPO_ANALYSIS_PLACEHOLDER}

Here is the technical design document:
<technical_design_document>
${TECHNICAL_DESIGN_DOC_PLACEHOLDER}
</technical_design_document>

<response_format_instructions>
Respond in the following XML format:

<gap_analysis>
  <functional_gaps>
    <gap>
      <category>functionality/component/API/data model/business process</category>
      <description></description>
      <current_state></current_state>
      <desired_state></desired_state>
      <impact></impact>
    </gap>
    <!-- Repeat for each identified functional gap -->
  </functional_gaps>
  
  <non_functional_gaps>
    <gap>
      <category>performance/scalability/security/maintainability/etc</category>
      <description></description>
      <current_state></current_state>
      <desired_state></desired_state>
      <impact></impact>
    </gap>
    <!-- Repeat for each identified non-functional gap -->
  </non_functional_gaps>
  
  <architectural_gaps>
    <gap>
      <description></description>
      <current_architecture></current_architecture>
      <proposed_architecture></proposed_architecture>
      <potential_challenges></potential_challenges>
    </gap>
    <!-- Repeat for each identified architectural gap -->
  </architectural_gaps>
  
  <technology_stack_gaps>
    <gap>
      <component></component>
      <current_technology></current_technology>
      <proposed_technology></proposed_technology>
      <rationale></rationale>
    </gap>
    <!-- Repeat for each identified technology stack gap -->
  </technology_stack_gaps>
  
  <integration_gaps>
    <gap>
      <systems_involved></systems_involved>
      <current_integration></current_integration>
      <proposed_integration></proposed_integration>
      <potential_challenges></potential_challenges>
    </gap>
    <!-- Repeat for each identified integration gap -->
  </integration_gaps>
  
  <missing_components>
    <component>
      <name></name>
      <purpose></purpose>
      <related_requirements></related_requirements>
    </component>
    <!-- List components specified in TDD but missing from current system -->
  </missing_components>
  
  <cross_cutting_concern_gaps>
    <gap>
      <concern></concern>
      <current_implementation></current_implementation>
      <required_implementation></required_implementation>
      <impact></impact>
    </gap>
    <!-- Repeat for each gap in cross-cutting concerns -->
  </cross_cutting_concern_gaps>
  
  <ambiguities>
    <item>
      <description></description>
      <location_in_tdd></location_in_tdd>
      <potential_impact></potential_impact>
    </item>
    <!-- List any ambiguities in the TDD that need clarification -->
  </ambiguities>
</gap_analysis>
</response_format_instructions>

Based on these instructions, perform a comprehensive gap analysis between the current system and the proposed technical design document, using the specified XML format for your response.
`;
    }

    protected handleResponse(response: string): string {
        // extract the gap_analysis block
        const match = response.match(/<gap_analysis>[\s\S]*<\/gap_analysis>/);
        const matchedBlock = match ? match[0] : "";

        // Parse the response into an intermediate format
        // const parsedData = this.responseParser.parse(matchedBlock) as any;

        return matchedBlock;
    }
}
