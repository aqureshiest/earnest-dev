import { PRD_ANALYSIS_PLACEHOLDER } from "@/constants";
import { PromptBuilder } from "../../support/PromptBuilder";
import { ResponseParser } from "../../support/ResponseParser";
import { TokenLimiter } from "../../support/TokenLimiter";
import { StandardAssistant } from "../StandardAssistant";

export class PRDGeneratorAssistant extends StandardAssistant<TaskRequest, string> {
    private responseParser: ResponseParser<string>;

    constructor() {
        super(new PromptBuilder(), new TokenLimiter());
        this.responseParser = new ResponseParser<string>();
    }

    override getSystemPrompt(): string {
        return `
You are an expert Product Manager tasked with creating comprehensive Product Requirements Documents (PRDs) from existing product documentation.

<objective>
Transform product documentation into a clear, structured PRD that defines product goals, features, requirements, and success metrics.
</objective>

<instructions>
<key_components>
* Executive Summary: Concise overview of product vision and objectives
* Problem Statement: Clear articulation of user needs and market opportunities
* Product Goals: Specific, measurable objectives aligned with business strategy
* Target Users: Detailed user personas and use cases
* Requirements: Functional and non-functional specifications
* Features & Capabilities: Prioritized feature set with acceptance criteria
* Success Metrics: KPIs and success criteria
* Dependencies & Constraints: Technical, business, and resource limitations
* Timeline & Milestones: High-level delivery schedule
* Risks & Mitigations: Identified risks and mitigation strategies
</key_components>

<writing_guidelines>
* Use clear, unambiguous language
* Prioritize user value and business impact
* Include specific, measurable criteria
* Maintain traceability between requirements
* Distinguish between must-have and nice-to-have features
* Focus on the "what" not the "how" of implementation
</writing_guidelines>

<quality_standards>
* Each requirement must be testable
* Features must have clear acceptance criteria
* Dependencies must be explicitly stated
* Assumptions must be documented
* Edge cases must be considered
* Non-functional requirements must be quantifiable
</quality_standards>
</instructions>`;
    }

    override getPrompt(params: any | null): string {
        return `
Here is the product documentation to transform into a PRD:
<product_document>
${PRD_ANALYSIS_PLACEHOLDER}
</product_document>


<response_format>
Respond in the following XML format:

<prd>
  <executive_summary>
    <vision></vision>
    <objectives></objectives>
  </executive_summary>

  <problem_statement>
    <user_needs></user_needs>
    <market_opportunity></market_opportunity>
    <current_solutions></current_solutions>
  </problem_statement>

  <product_goals>
    <goal>
      <description></description>
      <success_metric></success_metric>
      <timeline></timeline>
    </goal>
  </product_goals>

  <target_users>
    <persona>
      <name></name>
      <description></description>
      <needs></needs>
      <pain_points></pain_points>
    </persona>
  </target_users>

  <requirements>
    <functional>
      <requirement>
        <id></id>
        <description></description>
        <priority></priority>
        <acceptance_criteria></acceptance_criteria>
      </requirement>
    </functional>
    <non_functional>
      <requirement>
        <id></id>
        <type>performance/security/scalability/etc</type>
        <description></description>
        <metric></metric>
      </requirement>
    </non_functional>
  </requirements>

  <features>
    <feature>
      <name></name>
      <description></description>
      <user_value></user_value>
      <requirements_ids></requirements_ids>
      <acceptance_criteria></acceptance_criteria>
      <priority>must-have/nice-to-have</priority>
    </feature>
  </features>

  <success_metrics>
    <metric>
      <name></name>
      <description></description>
      <target></target>
      <measurement_method></measurement_method>
    </metric>
  </success_metrics>

  <dependencies>
    <dependency>
      <type>technical/business/resource</type>
      <description></description>
      <impact></impact>
    </dependency>
  </dependencies>

  <timeline>
    <milestone>
      <name></name>
      <deliverables></deliverables>
      <target_date></target_date>
    </milestone>
  </timeline>

  <risks>
    <risk>
      <description></description>
      <impact>high/medium/low</impact>
      <mitigation></mitigation>
    </risk>
  </risks>
</prd>
</response_format>

Generate a comprehensive PRD based on the provided documentation using the specified XML format.`;
    }

    protected handleResponse(response: string): string {
        const match = response.match(/<prd>[\s\S]*<\/prd>/);
        return match ? match[0] : "";
    }
}
