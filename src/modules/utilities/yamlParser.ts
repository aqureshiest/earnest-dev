import yaml from "js-yaml";

export function parseYaml<T>(yamlString: string): T {
    // Extract the YAML content between the ```yaml``` tags
    const parsed = yamlString.match(/```yaml([\s\S]*?)```/);
    if (parsed && parsed[1]) {
        try {
            // Manually merge duplicate keys before parsing the YAML
            const mergedYaml = mergeDuplicateKeys(parsed[1].trim());

            // Parse the modified YAML
            return yaml.load(mergedYaml) as T;
        } catch (error) {
            console.error("Error in parsing YAML", error);
            throw error;
        }
    } else {
        console.error("YAML tags not found or empty content.");
        throw new Error("Error in parsing YAML");
    }
}

function mergeDuplicateKeys(yamlString: string): string {
    const lines = yamlString.split("\n");
    const result: string[] = [];
    const sections: { [key: string]: string[] } = {};

    let currentSection: string | null = null;

    for (const line of lines) {
        const sectionMatch = line.match(/^(\w+Files):$/);

        if (sectionMatch) {
            currentSection = sectionMatch[1];
            if (!sections[currentSection]) {
                sections[currentSection] = [];
            }
            // Start a new section only if it hasn't already been started
            if (!result.includes(line)) {
                result.push(line); // Push the section header
            }
        } else if (currentSection) {
            sections[currentSection].push(line);
        } else {
            result.push(line);
        }
    }

    // Add collected section data back to result
    for (const section in sections) {
        const mergedSection = sections[section].join("\n");
        const sectionIndex = result.indexOf(`${section}:`);
        result.splice(sectionIndex + 1, 0, mergedSection);
    }

    return result.join("\n");
}
