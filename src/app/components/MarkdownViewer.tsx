import React from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import "github-markdown-css";
import "highlight.js/styles/github-dark.css";

type MarkdownViewerProps = {
    content: string;
    className?: string;
};

const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ content, className }) => {
    return (
        <div
            className={`markdown-body dark:!bg-slate-900 ${className}`}
            data-color-mode="auto"
            data-dark-theme="dark"
        >
            <ReactMarkdown rehypePlugins={[rehypeHighlight]} remarkPlugins={[remarkGfm]}>
                {content}
            </ReactMarkdown>
        </div>
    );
};

export default MarkdownViewer;
