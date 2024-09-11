import { parseYaml } from "@/modules/utils/parseYaml";
import { parseMarkdown } from "@/modules/utils/parseMarkdown";
import { parseDiff } from "@/modules/utils/parseDiff";
import { parseXml } from "@/modules/utils/parseXml";

export class ResponseParser<T> {
    parse(response: string, options: any = {}): T {
        const trimmedResponse = response.trim();

        try {
            if (trimmedResponse.startsWith("```yaml")) {
                return parseYaml(trimmedResponse) as T;
            } else if (trimmedResponse.startsWith("```markdown")) {
                return parseMarkdown(trimmedResponse) as T;
            } else if (trimmedResponse.startsWith("```diff")) {
                return parseDiff(trimmedResponse) as T;
            } else if (
                trimmedResponse.startsWith("```xml") ||
                (trimmedResponse.startsWith("<") && trimmedResponse.endsWith(">"))
            ) {
                return parseXml(trimmedResponse, options) as T;
            } else {
                return trimmedResponse as T;
            }
        } catch (error) {
            console.error("Error parsing AI response:", error);
            throw error;
        }
    }
}
