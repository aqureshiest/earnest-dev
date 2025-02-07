import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import _ from "lodash";

/**
 * Converts any value to a markdown string representation
 */
const valueToMarkdown = (value: any, depth: number = 0): string => {
    if (value === null || value === undefined) {
        return "_null_";
    }

    if (typeof value === "string") {
        // If the value looks like markdown, preserve it
        if (value.includes("#") || value.includes("```") || value.includes("|")) {
            return `\n${value}\n`;
        }
        return value;
    }

    if (typeof value === "number" || typeof value === "boolean") {
        return value.toString();
    }

    if (Array.isArray(value)) {
        // Check if it's an array of simple values
        if (value.every((item) => typeof item !== "object")) {
            return value.join(", ");
        }

        // For arrays of objects, create a table if possible
        if (value.length > 0 && typeof value[0] === "object") {
            const sample = value[0];
            const keys = Object.keys(sample);

            // If all items have the same simple keys, create a table
            if (
                value.every(
                    (item) =>
                        typeof item === "object" &&
                        Object.keys(item).length === keys.length &&
                        keys.every((key) => typeof item[key] !== "object")
                )
            ) {
                const header = `| ${keys.join(" | ")} |\n| ${keys.map(() => "---").join(" | ")} |`;
                const rows = value
                    .map((item) => `| ${keys.map((key) => item[key]).join(" | ")} |`)
                    .join("\n");
                return `\n${header}\n${rows}\n`;
            }
        }

        // Otherwise, process each item recursively
        return value.map((item) => jsonToMarkdown(item, depth + 1)).join("\n\n");
    }

    // For objects, process recursively
    return jsonToMarkdown(value, depth);
};

/**
 * Converts a JSON object into a markdown string
 */
const jsonToMarkdown = (json: any, depth: number = 0): string => {
    if (!json || typeof json !== "object") {
        return valueToMarkdown(json, depth);
    }

    let markdown = "";
    const indent = "#".repeat(Math.min(depth + 1, 6));

    // Sort keys to put likely header/title fields first
    const keys = Object.keys(json).sort((a, b) => {
        const headerPriority = ["title", "name", "header", "description", "summary"];
        const aIndex = headerPriority.indexOf(a.toLowerCase());
        const bIndex = headerPriority.indexOf(b.toLowerCase());
        if (aIndex === -1 && bIndex === -1) return 0;
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
    });

    keys.forEach((key) => {
        const value = json[key];

        // Convert key from camelCase/snake_case to Title Case for headers
        const formattedKey = key
            .replace(/([A-Z])/g, " $1")
            .replace(/_/g, " ")
            .split(" ")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");

        // Special handling for title-like keys at root level
        if (depth === 0 && ["title", "name", "header"].includes(key.toLowerCase())) {
            markdown += `# ${valueToMarkdown(value, depth)}\n\n`;
            return;
        }

        // Add header for each key unless it's a simple value in a deep object
        if (depth < 3 || typeof value === "object") {
            markdown += `${indent} ${formattedKey}\n\n`;
        }

        // Process the value
        const valueMarkdown = valueToMarkdown(value, depth + 1);
        markdown += `${valueMarkdown}\n\n`;
    });

    return markdown.trim();
};

interface GenericMarkdownViewerProps {
    data: any;
    config?: {
        title?: string;
    };
}

const GenericMarkdownViewer: React.FC<GenericMarkdownViewerProps> = ({ data, config }) => {
    // If the data is already a string, assume it's markdown
    if (typeof data === "string") {
        return (
            <Card>
                {config?.title && (
                    <CardHeader>
                        <CardTitle>{config.title}</CardTitle>
                    </CardHeader>
                )}
                <CardContent>
                    <ScrollArea className="h-[600px]">
                        <div className="prose dark:prose-invert max-w-none p-4">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{data}</ReactMarkdown>
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        );
    }
    // If data has a single root key, use its value instead
    const processedData = Object.keys(data).length === 1 ? data[Object.keys(data)[0]] : data;

    // Convert the data to markdown
    const markdown = jsonToMarkdown(processedData);

    return (
        <Card>
            {config?.title && (
                <CardHeader>
                    <CardTitle>{config.title}</CardTitle>
                </CardHeader>
            )}
            <CardContent>
                <ScrollArea className="h-[600px]">
                    <div className="prose dark:prose-invert max-w-none p-4">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};

// Export the converter function for use in other components
export { jsonToMarkdown };
export default GenericMarkdownViewer;
