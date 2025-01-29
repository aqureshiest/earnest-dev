import React from "react";
import hljs from "highlight.js/lib/core";
import json from "highlight.js/lib/languages/json";
import "highlight.js/styles/github.css"; // using light theme

// Register JSON language
hljs.registerLanguage("json", json);

interface JsonViewerProps {
    data: any;
}

const JsonViewer: React.FC<JsonViewerProps> = ({ data }) => {
    const jsonString = React.useMemo(() => JSON.stringify(data, null, 2), [data]);

    const highlightedCode = React.useMemo(
        () => hljs.highlight(jsonString, { language: "json" }).value,
        [jsonString]
    );

    return (
        <div className="rounded-lg bg-white">
            <pre className="text-sm overflow-auto max-h-[400px] whitespace-pre-wrap break-words">
                <code
                    dangerouslySetInnerHTML={{ __html: highlightedCode }}
                    className="hljs language-json"
                />
            </pre>
        </div>
    );
};

export default JsonViewer;
