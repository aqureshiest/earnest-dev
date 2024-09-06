import { CODEFILES_PLACEHOLDER } from "@/constants";
import { PromptBuilder } from "../support/PromptBuilder";
import { ResponseParser } from "../support/ResponseParser";
import { TokenLimiter } from "../support/TokenLimiter";
import { BaseAssistant } from "./BaseAssistant";
import { BaseAssistantChunkable } from "./BaseAssistantChunkable";

export class CodeAnalyzer extends BaseAssistantChunkable<string> {
    private responseParser: ResponseParser<string>;

    constructor() {
        super(new PromptBuilder(), new TokenLimiter());

        this.responseParser = new ResponseParser<string>();
    }

    override getSystemPrompt(): string {
        return `
You are an expert software developer tasked with understanding a large codebase.
Analyze the provided chunk of code, which may contain multiple files, and extract key information
that contributes to understanding the overall functionality, purpose, and potential use cases of the application.

<objective>
Provide a concise summary of the chunk's contents, focusing on the main functionality it implements, 
how it might be used in a product, and how developers could potentially utilize or extend this code.
</objective>

<instructions>
Focus on:
- The main functionality or features implemented in this chunk
- How this code contributes to the overall application or product
- Potential use cases or scenarios where this code would be relevant
- Key APIs, services, or interfaces provided by this code
- How a developer might interact with or extend this code
- Any notable technical decisions or patterns used

Avoid:
- Detailed descriptions of file structures or configurations unless critically important
- Listing every component or function unless they represent core functionality
- Implementation specifics unless they significantly impact usage or extensibility
</instructions>
`;
    }

    override getPrompt(params: any | null): string {
        return `
Here is the chunk of code you will be analyzing:
<code_chunk>
${CODEFILES_PLACEHOLDER}
</code_chunk>

<metadata>
<chunk_number>[[CHUNKNUMBER]]</chunk_number>
</metadata>

<response_format_instructions>
Respond in the following format:

<chunk_analysis>
	<chunk_number>[[CHUNKNUMBER]]</chunk_number>
	<main_functionality>Describe the primary functionality or features implemented in this chunk</main_functionality>
	<application_context>Explain how this code fits into the broader application or product</application_context>
	<use_cases>
		<use_case>
			<description>Describe a potential use case or scenario for this code</description>
			<relevance>Explain why this use case is important or how it adds value</relevance>
		</use_case>
		<!-- Repeat for 2-3 key use cases -->
	</use_cases>
	<key_interfaces>
		<interface>
			<name>Name of API, service, or important function</name>
			<purpose>Brief description of its purpose and how developers might use it</purpose>
		</interface>
		<!-- Repeat for each significant interface -->
	</key_interfaces>
	<developer_notes>
		<note>Provide insights on how developers might interact with, extend, or modify this code</note>
		<!-- Include 2-3 relevant notes -->
	</developer_notes>
	<technical_highlights>
		<highlight>
			<description>Describe a notable technical decision, pattern, or architecture choice</description>
			<impact>Explain its impact on functionality, scalability, or development</impact>
		</highlight>
		<!-- Include 1-2 significant highlights -->
	</technical_highlights>
</chunk_analysis>

</response_format_instructions>

Now, analyze the provided chunk and respond using this format, focusing on practical functionality and developer-oriented insights.
`;
    }

    protected handleResponse(model: string, task: string, response: string): string {
        // extract the chunk_analysis block
        const match = response.match(/<chunk_analysis>[\s\S]*<\/chunk_analysis>/);
        const matchedBlock = match ? match[0] : "";

        // Parse the response into an intermediate format
        const parsedData = this.responseParser.parse(
            model,
            task,
            this.constructor.name,
            matchedBlock
        ) as any;

        return response;
    }
}
