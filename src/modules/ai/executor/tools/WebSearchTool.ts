import { ToolRequest, ToolResponse } from "@/types/executor";
import { BaseTool } from "./BaseTool";
import axios from "axios";

export class SearchTool extends BaseTool {
    public name: string = "search";
    public description: string = "Searches the web for information on a given query";

    private apiKey: string;

    constructor(apiKey: string) {
        super();
        this.apiKey = apiKey;
    }

    protected async executeImpl(request: ToolRequest): Promise<ToolResponse> {
        const { requestId, input } = request;

        try {
            // use SERP API
            const response = await axios.get("https://serpapi.com/search", {
                params: {
                    api_key: this.apiKey,
                    engine: "google",
                    q: input,
                    num: 5, // Limit to 5 results
                },
            });

            // Format search results
            const results = response.data.items || [];
            const formattedResults = results
                .map((result: any, index: number) => {
                    return `[${index + 1}] ${result.title}
URL: ${result.link}
${result.snippet || "No description available"}
`;
                })
                .join("\n");

            const summary =
                results.length > 0
                    ? `Found ${results.length} results for query: "${input}"\n\n${formattedResults}`
                    : `No results found for query: "${input}"`;

            return {
                requestId,
                content: summary,
                status: "success",
                metadata: {
                    totalResults: response.data.searchInformation?.totalResults || 0,
                    searchTime: response.data.searchInformation?.searchTime || 0,
                },
            };
        } catch (error) {
            console.error("Error in search tool:", error);

            return {
                requestId,
                content: `Failed to search for: "${input}". ${
                    error instanceof Error ? error.message : "Unknown error"
                }`,
                status: "error",
            };
        }
    }
}
