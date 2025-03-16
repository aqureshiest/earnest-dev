import { Tool, ToolRegistry } from "@/types/executor";

export class DefaultToolRegistry implements ToolRegistry {
    private tools: Map<string, Tool> = new Map();

    public registerTool(tool: Tool): void {
        if (this.tools.has(tool.name)) {
            throw new Error(`Tool with name ${tool.name} is already registered`);
        }

        this.tools.set(tool.name, tool);
        console.log(`Tool registered: ${tool.name}`);
    }

    public getTool(name: string): Tool | undefined {
        return this.tools.get(name);
    }

    public getAllTools(): Tool[] {
        return Array.from(this.tools.values());
    }

    public getToolDescriptions(): string {
        if (this.tools.size === 0) {
            return "No tools available.";
        }

        return Array.from(this.tools.values())
            .map((tool) => {
                let description = `- name: ${tool.name}\n  description: ${tool.description}`;

                // Add parameters information if available
                if (tool.parameters && Object.keys(tool.parameters).length > 0) {
                    description += "\n  parameters:";
                    for (const [key, value] of Object.entries(tool.parameters)) {
                        description += `\n    - ${key}: ${
                            typeof value === "object" ? JSON.stringify(value) : value
                        }`;
                    }
                }

                return description;
            })
            .join("\n\n");
    }

    public unregisterTool(name: string): boolean {
        const result = this.tools.delete(name);
        if (result) {
            console.log(`Tool unregistered: ${name}`);
        }
        return result;
    }

    public hasTool(name: string): boolean {
        return this.tools.has(name);
    }

    public getToolCount(): number {
        return this.tools.size;
    }

    public clearTools(): void {
        this.tools.clear();
        console.log("All tools cleared from registry");
    }
}
