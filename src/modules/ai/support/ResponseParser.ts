import { parseYaml } from "@/modules/utils/parseYaml";
import { parseMarkdown } from "@/modules/utils/parseMarkdown";
import { parseDiff } from "@/modules/utils/parseDiff";
import { parseXml } from "@/modules/utils/parseXml";
import { saveRunInfo } from "@/modules/utils/saveRunInfo";

export class ResponseParser<T> {
    parse(model: string, task: string, assistant: string, response: string, options: any = {}): T {
        const trimmedResponse = response.trim();

        saveRunInfo(model, task, assistant, "ai_response", trimmedResponse);

        try {
            if (trimmedResponse.startsWith("```yaml")) {
                const parsed = parseYaml(trimmedResponse) as T;
                saveRunInfo(model, task, assistant, "ai_response", parsed, "yaml");
                return parsed;
            } else if (trimmedResponse.startsWith("```markdown")) {
                const parsed = parseMarkdown(trimmedResponse) as T;
                saveRunInfo(model, task, assistant, "ai_response", parsed, "md");
                return parsed;
            } else if (trimmedResponse.startsWith("```diff")) {
                const parsed = parseDiff(trimmedResponse) as T;
                saveRunInfo(model, task, assistant, "ai_response", parsed, "diff");
                return parsed;
            } else if (
                trimmedResponse.startsWith("```xml") ||
                (trimmedResponse.startsWith("<") && trimmedResponse.endsWith(">"))
            ) {
                const parsed = parseXml(trimmedResponse, options) as T;
                saveRunInfo(model, task, assistant, "ai_response", parsed, "xml");
                return parsed;
            } else {
                return trimmedResponse as T;
            }
        } catch (error) {
            console.error("Error parsing AI response:", error);
            throw error;
        }
    }
}
