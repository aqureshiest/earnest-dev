import { ExecutorService } from "./ExecutorService";
import { ExecutorAssistant } from "./ExecutorAssistant";
import { DefaultToolRegistry } from "./DefaultToolRegistry";
import { CodingTool } from "./tools/CodingTool";
import { SearchTool } from "./tools/WebSearchTool";
import { Tool } from "@/types/executor";

export class ExecutorFactory {
    private static instance: ExecutorService | null = null;

    public static getExecutorService(): ExecutorService {
        if (!this.instance) {
            const toolRegistry = new DefaultToolRegistry();
            const executorAssistant = new ExecutorAssistant();
            this.instance = new ExecutorService(toolRegistry, executorAssistant);

            // Register default tools
            this.registerDefaultTools(toolRegistry);
        }

        return this.instance;
    }

    public static createExecutorService(tools: Tool[] = []): ExecutorService {
        const toolRegistry = new DefaultToolRegistry();
        const executorAssistant = new ExecutorAssistant();
        const executorService = new ExecutorService(toolRegistry, executorAssistant);

        // Register provided tools
        tools.forEach((tool) => toolRegistry.registerTool(tool));

        return executorService;
    }

    private static registerDefaultTools(toolRegistry: DefaultToolRegistry): void {
        toolRegistry.registerTool(new SearchTool(process.env.SERP_API_KEY!));

        // Register coding and PR tools if environment variables are available
        const owner = process.env.NEXT_PUBLIC_GITHUB_OWNER;
        if (owner) {
            // Use default repo and branch or fallback to environment variables
            const repo = "bookstore";
            const branch = "main";

            // Add coding tool
            toolRegistry.registerTool(new CodingTool({ owner, repo, branch }));

            // Add PR tool
            // toolRegistry.registerTool(new PRTool({ owner, repo, branch }));
        }
    }

    public static createSearchTool(): Tool {
        return new SearchTool(process.env.SERP_API_KEY!);
    }
}
