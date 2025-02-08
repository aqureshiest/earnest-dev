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
            className={`
                markdown-body 
                dark:bg-slate-900 
                dark:[&_*]:text-slate-200
                dark:[&_h1,&_h2,&_h3,&_h4,&_h5,&_h6,&_strong]:text-white
                dark:[&_pre,&_code]:bg-slate-800
                dark:[&_a]:text-blue-400
                ${className}
            `}
            data-color-mode="dark"
            data-dark-theme="dark"
        >
            <ReactMarkdown rehypePlugins={[rehypeHighlight]} remarkPlugins={[remarkGfm]}>
                {content}
            </ReactMarkdown>
        </div>
    );
};

export default MarkdownViewer;
