import * as yaml from "js-yaml";

export function parseYaml(str: string) {
    const parsed = str.match(/```yaml([\s\S]*?)```/);
    if (parsed && parsed[1]) {
        try {
            return yaml.load(parsed[1].trim());
        } catch (e) {
            console.error("Failed to parse YAML response:", e);
        }
    } else {
        console.error("No YAML content found in the response.");
    }
    return null;
}
