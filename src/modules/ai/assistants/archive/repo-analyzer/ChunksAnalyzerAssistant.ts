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
Analyze the given chunk of code to extract critical information: key components, relationships, and significant code sections.
</objective>

<instructions> 
<summary>
* Read the provided code files.
* Identify key classes, methods, and dependencies within the chunk.
* List out important code components and their roles.
* Analyze interdependencies between the components.
* Generate a summary of how this chunk fits into the broader codebase.
</summary>

<considerations>
* Focus on identifying core components and their relationships.
* Consider readability, clarity, and organization of the code.
* Take note of any areas that seem incomplete or undocumented.
</considerations>

<constraints>
* Avoid redundant information already found in other chunks.
* Do not analyze beyond the provided chunk.
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

<CodeChunkAnalysis>
  <Components>
    <Component name="Component1">
      <Type>Class</Type>
      <Role>Handles XYZ</Role>
      <Dependencies>DependencyA, DependencyB</Dependencies>
    </Component>
    <!-- Additional Components as needed -->
  </Components>
  <Relationships>
    <Relation from="Component1" to="Component2">Uses</Relation>
  </Relationships>
  <Summary>This chunk is responsible for ...</Summary>
</CodeChunkAnalysis>

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
