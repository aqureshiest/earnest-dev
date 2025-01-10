import { CodebaseChunksAssistant } from "../assistants/CodebaseChunksAssistant";
import { PromptBuilder } from "../support/PromptBuilder";
import { TokenLimiter } from "../support/TokenLimiter";
import { ResponseParser } from "../support/ResponseParser";
import { CODEFILES_PLACEHOLDER } from "@/constants";

interface ExtensionConfig {
    id: string;
    systemPrompt: string;
    outputSchema: {
        type: string;
        structure: Record<string, any>;
        responseFormat: string;
    };
}

export class DynamicAssistant extends CodebaseChunksAssistant<any> {
    private responseParser: ResponseParser<any>;
    private extensionConfig: ExtensionConfig;

    constructor(config: ExtensionConfig) {
        super(new PromptBuilder(), new TokenLimiter());
        this.responseParser = new ResponseParser<any>();
        this.extensionConfig = config;
    }

    getSystemPrompt(): string {
        return this.extensionConfig.systemPrompt;
    }

    getPrompt(params?: any): string {
        return `
Here are the existing code files you will be working with:
<existing_codebase>
${CODEFILES_PLACEHOLDER}
</existing_codebase>

<response_format>
${this.extensionConfig.outputSchema.responseFormat}
</response_format>

Analyze the codebase according to the instructions above and provide your response in the specified format.
`;
    }

    protected handleResponse(response: string): any {
        // Convert the schema type to both camelCase and snake_case for flexibility
        const schemaPascalCase = this.extensionConfig.outputSchema.type.replace(/\s+/g, "");
        const schemaSnakeCase = this.extensionConfig.outputSchema.type
            .toLowerCase()
            .replace(/\s+/g, "_");
        const schemaCamelCase =
            schemaPascalCase.charAt(0).toLowerCase() + schemaPascalCase.slice(1);

        // Try matching different case formats
        const formats = [schemaPascalCase, schemaSnakeCase, schemaCamelCase];
        let matchedBlock = "";

        for (const format of formats) {
            const regex = new RegExp(`<${format}>[\\s\\S]*?<\\/${format}>`, "i");
            const match = response.match(regex);
            if (match) {
                matchedBlock = match[0];
                break;
            }
        }

        if (!matchedBlock) {
            console.error("Response:", response);
            console.error("Expected formats:", formats);
            throw new Error(
                `No matching block found in the response for formats: ${formats.join(", ")}`
            );
        }

        // Parse the response using the schema structure
        const options = {
            ignoreAttributes: false,
            attributeNamePrefix: "",
            isArray: (name: string, jpath: string) => {
                // Determine if a field should be treated as an array based on schema
                const path = jpath.split(".");
                let current = this.extensionConfig.outputSchema.structure;
                for (const segment of path) {
                    if (!current) break;
                    current = current[segment];
                }
                return current?.type === "array";
            },
        };

        const parsedData = this.responseParser.parse(matchedBlock, options);
        return parsedData;
    }

    protected aggregateResponses(responses: (any | null)[]): any {
        // Combine responses based on the schema type
        const aggregated: any = {};

        responses.forEach((response) => {
            if (response) {
                Object.entries(response).forEach(([key, value]) => {
                    if (Array.isArray(value)) {
                        if (!aggregated[key]) {
                            aggregated[key] = [];
                        }
                        aggregated[key].push(...value);
                    } else if (typeof value === "object") {
                        aggregated[key] = { ...aggregated[key], ...value };
                    } else {
                        aggregated[key] = value;
                    }
                });
            }
        });

        return aggregated;
    }
}
