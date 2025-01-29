import { OpenAIService } from "../clients/OpenAIService";
import { ExtensionConfig } from "@/types/extension";

export interface VisualizationConfig {
    type: string; // e.g., "table", "tree", "chart", "code", "swagger"
    components: Array<{
        id: string;
        type: string;
        dataPath: string; // JSON path to the data this component should display
        config: {
            title?: string;
            description?: string;
            columns?: Array<{
                // For table type
                key: string;
                label: string;
            }>;
            chartType?: string; // For chart type
            codeLanguage?: string; // For code type
            treeConfig?: {
                // For tree type
                nodeKey: string;
                childrenKey: string;
                labelKey: string;
            };
        };
    }>;
}

export class OutputVisualizationGenerator {
    private readonly aiService: OpenAIService;
    private readonly META_PROMPT = `You are an expert in data visualization and React development. 
Your task is to analyze an extension configuration and suggest the best way to visualize its output.

You MUST ONLY use the following supported visualization types:
- "table": For tabular data
- "tree": For hierarchical data
- "chart": For numerical/time-series data. Supported chart types:
  * "line" (default): For trend data over time
  * "bar": For comparing values across categories
  * "area": For showing cumulative values or ranges
  * "pie": For showing proportions of a whole
  Chart config should include:
  * chartType: one of the above types
  * xAxisKey: the key to use for x-axis values
  * title and description (optional)
- "code": For code snippets or formatted text
- "swagger": For OpenAPI/Swagger documentation
- "markdown": For formatted text and documentation

Consider:
1. The output schema structure
2. The specified visualization type
3. The defined output views
4. The nature of the data

You MUST return a JSON object that matches this structure exactly:
{
    "type": "string",  // Primary visualization type
    "components": [    // Array of components to display the data
        {
            "id": "string",     // Unique identifier
            "type": "string",   // Must be one of: "table", "tree", "chart", "code", "swagger"
            "dataPath": "string", // JSON path to access the data
            "config": {
                "title": "string",      // Optional - Component title
                "description": "string", // Optional - Component description
                "columns": [            // Optional - For table type
                    {
                        "key": "string",
                        "label": "string"
                    }
                ],
                "chartType": "string",  // Optional - For chart type
                "codeLanguage": "string", // Optional - For code type
                "treeConfig": {         // Optional - For tree type
                    "nodeKey": "string", // unique key for each node
                    "childrenKey": "string", // key to access children nodes
                    "labelKey": "string" // key to display as node label
                }
            }
        }
    ]
}

Example Response:
{
    "type": "composite",
    "components": [
        {
            "id": "main-table",
            "type": "table",
            "dataPath": "data",
            "config": {
                "title": "Data Overview",
                "columns": [
                    {"key": "name", "label": "Name"},
                    {"key": "value", "label": "Value"}
                ]
            }
        }
    ]
}

IMPORTANT:
- Return ONLY the JSON object, no additional text or explanation
- Ensure the response is valid JSON
- All fields should use exactly the names shown above
- Do not add TypeScript type annotations or interfaces
- Do not include any comments in the JSON response`;

    constructor() {
        this.aiService = new OpenAIService();
    }

    async generateVisualization(config: ExtensionConfig): Promise<VisualizationConfig> {
        try {
            const completion = await this.aiService.generateResponse(
                this.META_PROMPT,
                `Analyze this extension configuration and suggest the best visualization approach:
                ${JSON.stringify(config, null, 2)}
                
                Consider:
                1. The output schema type: ${config.outputSchema.type}
                2. The specified visualization: ${config.uiConfig.visualization}
                3. The output views: ${JSON.stringify(config.uiConfig.outputViews)}
                
                Return a JSON visualization configuration that best represents this data.`
            );

            // Clean the response to ensure it's valid JSON
            const cleanedResponse = completion.response
                .trim()
                .replace(/^```json\s*/, "") // Remove any markdown JSON prefix
                .replace(/\s*```$/, "") // Remove any markdown JSON suffix
                .replace(/\/\/.+/g, "") // Remove any single line comments
                .replace(/\/\*[\s\S]*?\*\//g, ""); // Remove any multi-line comments

            const response = JSON.parse(cleanedResponse);
            return this.validateVisualizationConfig(response);
        } catch (error: any) {
            console.error("Error generating visualization config:", error);
            throw new Error(`Failed to generate visualization: ${error.message}`);
        }
    }

    private validateVisualizationConfig(config: any): VisualizationConfig {
        // Basic validation
        if (!config.type || !Array.isArray(config.components)) {
            throw new Error("Invalid visualization configuration structure");
        }

        // Validate each component
        config.components.forEach((component: any) => {
            if (!component.id || !component.type || !component.dataPath) {
                throw new Error("Invalid component configuration");
            }
        });

        return config as VisualizationConfig;
    }
}
