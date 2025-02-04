import { PRD_ANALYSIS_PLACEHOLDER } from "@/constants";
import { PromptBuilder } from "../../support/PromptBuilder";
import { ResponseParser } from "../../support/ResponseParser";
import { TokenLimiter } from "../../support/TokenLimiter";
import { StandardAssistant } from "../StandardAssistant";

interface PRDGeneratorInput extends TaskRequest {
    template: string; // PRD template in markdown
    strategy: string; // Strategy document in markdown
    supportingDocs?: string[]; // Optional supporting documents in markdown
}

export class PRDGeneratorAssistant extends StandardAssistant<PRDGeneratorInput, string> {
    private responseParser: ResponseParser<string>;

    constructor() {
        super(new PromptBuilder(), new TokenLimiter());
        this.responseParser = new ResponseParser<string>();
    }

    override getSystemPrompt(): string {
        return `
You are an expert Product Manager tasked with creating comprehensive Product Requirements Documents (PRDs) based on provided documentation and templates.

<objective>
Generate a detailed PRD by synthesizing information from a strategy document and following a provided template structure, while incorporating relevant details from any supporting documentation.
</objective>

<instructions>
<document_handling>
* Template Document: Use this as the exact structure for the output PRD
* Strategy Document: Extract key strategic objectives, product vision, and business goals
* Supporting Documents: Incorporate relevant details to enrich the PRD content
</document_handling>

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

    override getPrompt(params: PRDGeneratorInput): string {
        return `
Here are the input documents to generate the PRD:

<template_document>
${params.template}
</template_document>

<strategy_document>
${params.strategy}
</strategy_document>

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
3. Enriches content with relevant details from supporting documents
4. Ensures all sections are complete and aligned with the strategy
5. Maintains internal consistency and traceability

Important: 
- Keep all formatting, headers, and structure exactly as specified in the template
- Ensure each section contains relevant, detailed content
- Verify that all requirements align with strategic objectives
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
