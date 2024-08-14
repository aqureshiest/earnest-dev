import React from "react";
import hljs from "highlight.js";
import "highlight.js/styles/github.css";

function YamlDisplay({ yamlContent }: { yamlContent: any }) {
    const cleanedYamlContent = yamlContent
        .replace(/```yaml/g, "")
        .replace(/```/g, "")
        .trim();
    const highlightedContent = hljs.highlight("yaml", cleanedYamlContent).value;

    return (
        <pre>
            <code dangerouslySetInnerHTML={{ __html: highlightedContent }} />
        </pre>
    );
}

export default YamlDisplay;
