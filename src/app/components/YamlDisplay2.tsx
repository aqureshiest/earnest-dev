import React from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";

function YamlDisplay({ yamlContent }: { yamlContent: any }) {
    const cleanedYamlContent = yamlContent
        .replace(/```yaml/g, "")
        .replace(/```/g, "")
        .trim();

    return (
        <SyntaxHighlighter language="yaml" style={tomorrow}>
            {cleanedYamlContent}
        </SyntaxHighlighter>
    );
}

export default YamlDisplay;
