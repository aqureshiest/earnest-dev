import { PromptBuilder } from "../../support/PromptBuilder";
import { ResponseParser } from "../../support/ResponseParser";
import { TokenLimiter } from "../../support/TokenLimiter";
import { StandardAssistant } from "../StandardAssistant";

interface PRDGeneratorWithExampleInput extends TaskRequest {
    template: string; // PRD template in markdown
    strategy: string; // Strategy document in markdown
    supportingDocs?: string[]; // Optional supporting documents in markdown
    examplePRD: string; // High-quality example PRD in markdown
}

export class PRDGeneratorWithExamplesAssistant extends StandardAssistant<
    PRDGeneratorWithExampleInput,
    string
> {
    private responseParser: ResponseParser<string>;

    constructor() {
        super(new PromptBuilder(), new TokenLimiter());
        this.responseParser = new ResponseParser<string>();
    }

    override getSystemPrompt(): string {
        return `
You are an expert Product Manager tasked with creating comprehensive Product Requirements Documents (PRDs) based on provided documentation, templates, and examples.

<objective>
Generate a detailed PRD by synthesizing information from a strategy document and following a provided template structure, while learning from a high-quality example PRD and incorporating relevant details from supporting documentation.
</objective>

<instructions>
<document_handling>
* Template Document: Use this as the exact structure for the output PRD
* Strategy Document: Extract key strategic objectives, product vision, and business goals
* Supporting Documents: Incorporate relevant details to enrich the PRD content
* Example PRD: Use as reference for writing style, detail level, and section interconnections
</document_handling>

<example_usage_guidelines>
* Study the example PRD's:
  - Level of detail and specificity
  - Writing style and tone
  - Way of connecting requirements to goals
  - Method of describing features and acceptance criteria
  - Approach to risk and dependency documentation
* Do NOT copy specific content or requirements
* Focus on learning the patterns and depth of analysis
</example_usage_guidelines>

<analysis_guidelines>
* Maintain consistency with the provided template structure
* Ensure all sections from the template are filled with relevant content
* Extract and incorporate strategic objectives from the strategy document
* Use supporting documentation to add depth and context
* Maintain traceability between different sections
* Ensure all requirements are specific, measurable, and actionable
</analysis_guidelines>

<writing_guidelines>
* Use clear, unambiguous language
* Maintain consistent formatting and structure
* Ensure each requirement is testable and measurable
* Include specific success criteria and metrics
* Clearly distinguish between must-have and nice-to-have features
* Document all assumptions and dependencies
* Consider edge cases and risks
</writing_guidelines>

<quality_standards>
* All template sections must be completed
* Content must align with strategic objectives
* Requirements must be testable and measurable
* Dependencies must be explicitly stated
* Risks and mitigation strategies must be identified
* Success metrics must be quantifiable
</quality_standards>
</instructions>`;
    }

    override getPrompt(params: PRDGeneratorWithExampleInput): string {
        return `
Here are the input documents to generate the PRD:

<template_document>
${params.template}
</template_document>

<strategy_document>
${params.strategy}
</strategy_document>

<example_prd>
${params.examplePRD}
</example_prd>

${
    params.supportingDocs
        ? params.supportingDocs
              .map(
                  (doc, index) => `
<supporting_document_${index + 1}>
${doc}
</supporting_document_${index + 1}>
`
              )
              .join("\n")
        : ""
}

<task>
Generate a comprehensive PRD that:
1. Follows the exact structure and format of the template document
2. Incorporates strategic objectives and vision from the strategy document
3. Matches the quality level and writing style of the example PRD
4. Enriches content with relevant details from supporting documents
5. Ensures all sections are complete and aligned with the strategy
6. Maintains internal consistency and traceability

Important: 
- Keep all formatting, headers, and structure exactly as specified in the template
- Match the depth and quality of the example PRD
- Ensure each section contains relevant, detailed content
- Verify that all requirements align with strategic objectives
- Do NOT copy specific content from the example PRD
</task>`;
    }

    protected handleResponse(response: string): string {
        // Extract the PRD content while preserving formatting
        const prdContent = response.trim();

        // Validate that the response follows the template structure
        if (!this.validateTemplateStructure(prdContent)) {
            throw new Error("Generated PRD does not match template structure");
        }

        return prdContent;
    }

    private validateTemplateStructure(content: string): boolean {
        // TODO: Implement validation logic to ensure the generated PRD
        // matches the structure of the template document
        return true;
    }
}
