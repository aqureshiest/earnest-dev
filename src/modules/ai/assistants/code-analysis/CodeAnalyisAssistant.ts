import { PromptBuilder } from "@/modules/ai/support/PromptBuilder";
import { ResponseParser } from "@/modules/ai/support/ResponseParser";
import { TokenLimiter } from "@/modules/ai/support/TokenLimiter";
import { CODEFILES_PLACEHOLDER, CRITICAL_PATTERNS_PLACEHOLDER } from "@/constants";
import { CodebaseChunksAssistant } from "@/modules/ai/assistants/CodebaseChunksAssistant";

export class CodeAnaylsisAssistant extends CodebaseChunksAssistant<AnalysisResponse> {
    private responseParser: ResponseParser<AnalysisResponse>;

    constructor() {
        super(new PromptBuilder(), new TokenLimiter());

        this.responseParser = new ResponseParser<AnalysisResponse>();
    }

    getSystemPrompt(): string {
        return `You are an expert architectural code reviewer specializing in modern distributed system patterns. Your goal is to identify critical architectural pattern violations and opportunities that impact system reliability, performance, and maintainability. 

Report only:
- Critical pattern violations affecting system reliability
- Missing patterns causing performance issues
- Architectural inconsistencies impacting maintenance
- Clear opportunities for significant improvement

`;
    }
    getPrompt(params?: any): string {
        return `
Here are the existing code files you will be working with:
<existing_codebase>
${CODEFILES_PLACEHOLDER}
</existing_codebase>

Here are the critical patterns you should focus on:
<patterns>
${CRITICAL_PATTERNS_PLACEHOLDER}
</patterns>

<response_format_instructions>
Respond in the following XML format:

<analysis>
    <file_info>
        <filename></filename>
        <violations>
            <pattern_violation>
                <pattern>[Pattern Name]</pattern>
                <location>File/function reference</location>                
                <issue>Concise description of the violation</issue>
                <impact>Business/technical impact</impact>
                <solution>
                    <description>Implementation guidance</description>
                    <code>
<![CDATA[
// Minimal example if needed, show how to integrate the solution with the existing code
]]>
</code>
                </solution>
                <priority>high|medium|low</priority>
            </pattern_violation>
        </violations>
        <opportunities>
            <suggestion>
                <pattern>[Pattern Name]</pattern>
                <location>Implementation target</location>
                <problem>Current issue to solve</problem>
                <benefit>Expected improvement</benefit>
                <implementation>
                    <code>
<![CDATA[
// Minimal example if needed, show how to integrate the solution with the existing code
]]>
</code>
                </implementation>
                <priority>high|medium|low</priority>
            </suggestion>
        </opportunities>
    </file_info>
</analysis>
</response_format_instructions>

Now, go ahead and analyze the codebase for critical architectural pattern violations and opportunities for improvement.

`;
    }

    protected handleResponse(response: string): AnalysisResponse {
        const options = {
            ignoreAttributes: false,
            attributeNamePrefix: "",
            isArray: (name: string, jpath: string) => {
                return ["file_info", "pattern_violation", "suggestion"].includes(name);
            },
        };

        // extract the AnalysisResponse block
        const match = response.match(/<analysis>[\s\S]*<\/analysis>/);
        const matchedBlock = match ? match[0] : "";

        // make sure the matched block is not empty
        if (!matchedBlock) {
            throw new Error("No analysis (or possibly cutoff) block found in the response");
        }

        // Parse the response into an intermediate format
        const parsedData = this.responseParser.parse(matchedBlock, options) as any;
        return parsedData as AnalysisResponse;
    }

    protected aggregateResponses(responses: (AnalysisResponse | null)[]): AnalysisResponse {
        const file_info: FileInfo[] = [];

        responses.forEach((response) => {
            if (response?.analysis?.file_info) {
                // Handle both array and single object cases
                const fileInfos = Array.isArray(response.analysis.file_info)
                    ? response.analysis.file_info
                    : [response.analysis.file_info];
                file_info.push(...fileInfos);
            }
        });

        return {
            analysis: {
                file_info,
            },
        };
    }
}
