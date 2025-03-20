import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import "github-markdown-css";
import "highlight.js/styles/github.css";
import { initializeMermaid } from "@/modules/utils/mermaid";

type MarkdownViewerProps = {
    content: string;
    className?: string;
};

// Custom component to render Mermaid diagrams
const MermaidRenderer: React.FC<{ content: string }> = ({ content }) => {
    const [svg, setSvg] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const id = useRef(`mermaid-${Math.random().toString(36).substr(2, 9)}`);
    const diagramRef = useRef<HTMLDivElement>(null);

    // Get mermaid instance
    const mermaid = initializeMermaid();

    useEffect(() => {
        const renderDiagram = async () => {
            try {
                // Configure mermaid rendering for dark mode
                const { svg } = await mermaid.render(id.current, content);

                // Add a class to the SVG for styling
                // Enhance SVG for better visibility in dark mode
                const enhancedSvg = svg
                    .replace("<svg ", '<svg class="mermaid-svg" ')
                    // Enhance text elements for better dark mode visibility
                    .replace(/<text /g, '<text fill="white" ');

                setSvg(enhancedSvg);
                setError(null);
            } catch (err) {
                console.error("Mermaid rendering error:", err);
                setError("Failed to render diagram. Please check your Mermaid syntax.");
            }
        };

        renderDiagram();
    }, [content, mermaid]);

    if (error) {
        return (
            <div className="p-4 border border-red-500 rounded bg-red-100 dark:bg-red-900 dark:text-red-200">
                <p>Error: {error}</p>
                <pre className="mt-2 overflow-auto">{content}</pre>
            </div>
        );
    }

    return (
        <>
            {/* Regular diagram display */}
            <div
                ref={diagramRef}
                className="my-4 flex justify-center relative group"
                dangerouslySetInnerHTML={{ __html: svg }}
            ></div>
        </>
    );
};

// Custom code component to handle different types of code blocks
// Using the proper type definition that ReactMarkdown expects
const CodeBlock = ({
    className,
    children,
    ...props
}: React.ClassAttributes<HTMLElement> &
    React.HTMLAttributes<HTMLElement> & {
        children?: React.ReactNode;
    }) => {
    // Check if this is a mermaid code block
    // ReactMarkdown will add "language-xyz" class to code blocks with ```xyz format
    if (className && className.indexOf("language-mermaid") > -1) {
        const content = React.Children.toArray(children).join("");
        return <MermaidRenderer content={content} />;
    }

    // Default code rendering for non-mermaid
    return (
        <code className={className} {...props}>
            {children}
        </code>
    );
};

const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ content, className }) => {
    return (
        <div
            className={`
                markdown-body 
                dark:bg-slate-900 
                dark:[&_*]:text-slate-200
                dark:[&_h1,&_h2,&_h3,&_h4,&_h5,&_h6,&_strong]:text-white
                dark:[&_pre,&_code]:bg-slate-800
                dark:[&_a]:text-blue-400
                dark:[&_table]:border-slate-700
                dark:[&_tr]:bg-transparent
                dark:[&_th]:border-slate-700
                dark:[&_th]:bg-slate-800
                dark:[&_td]:border-slate-700 
                dark:[&_td]:bg-slate-900
                dark:[&_pre_code]:text-slate-200
                ${className}
            `}
            data-color-mode="dark"
            data-dark-theme="dark"
        >
            <style jsx global>{`
                /* Force dark mode table styles */
                .dark .markdown-body table tr {
                    background-color: transparent;
                }
                .dark .markdown-body table tr:nth-child(2n) {
                    background-color: rgba(255, 255, 255, 0.05);
                }
                .dark .markdown-body table td,
                .dark .markdown-body table th {
                    color: #e2e8f0; /* slate-200 */
                    border-color: #334155; /* slate-700 */
                }
                .dark .markdown-body table th {
                    background-color: #1e293b; /* slate-800 */
                }
                .dark .markdown-body table td {
                    background-color: transparent;
                }

                /* Fix code blocks in dark mode */
                .dark .markdown-body pre {
                    background-color: #1e293b; /* slate-800 */
                    color: #e2e8f0; /* slate-200 */
                }
                .dark .markdown-body code {
                    color: #e2e8f0; /* slate-200 */
                    background-color: rgba(255, 255, 255, 0.05);
                }
                .dark .markdown-body pre code {
                    color: #e2e8f0; /* slate-200 */
                    background-color: transparent;
                }
            `}</style>
            <ReactMarkdown
                rehypePlugins={[rehypeHighlight]}
                remarkPlugins={[remarkGfm]}
                components={{
                    // This is where the magic happens - we intercept both code blocks (for mermaid)
                    // and regular code inline elements
                    code: CodeBlock,
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
};

export default MarkdownViewer;
