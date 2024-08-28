import React, { useEffect, useState } from "react";
import hljs from "highlight.js";
import "highlight.js/styles/github.css";
import ReactDiffViewer, { DiffMethod } from "react-diff-viewer";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/20/solid";

interface BaseFile {
    path: string;
    thoughts?: string;
    content?: string;
    oldContents?: string; // For modified files
}

type NewFile = BaseFile & {
    content: string;
};

type ModifiedFile = BaseFile & {
    oldContents: string;
    content: string;
};

type DeletedFile = BaseFile; // No content needed

interface CodeChanges {
    title: string;
    newFiles?: NewFile[];
    modifiedFiles?: ModifiedFile[];
    deletedFiles?: DeletedFile[];
}

const CodeViewer = ({
    codeChanges,
    owner,
    repo,
    branch,
    showDiff,
    excludedFiles,
    setExcludedFiles,
}: {
    codeChanges: CodeChanges;
    owner: string;
    repo: string;
    branch: string;
    showDiff: boolean;
    excludedFiles: Set<string>;
    setExcludedFiles: React.Dispatch<React.SetStateAction<Set<string>>>;
}) => {
    const [selectedFile, setSelectedFile] = useState<BaseFile | null>(null);
    const [loading, setLoading] = useState(false);

    const toggleExcludeFile = (filePath: string) => {
        setExcludedFiles((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(filePath)) {
                newSet.delete(filePath);
            } else {
                newSet.add(filePath);
            }
            return newSet;
        });
    };

    const renderFileList = (files: (NewFile | ModifiedFile | DeletedFile)[], category: string) => (
        <div className="mb-4">
            <h3 className="font-semibold mb-2">{category}</h3>
            {files.map((file) => (
                <div
                    key={file.path}
                    className={`p-2 cursor-pointer flex items-center justify-between ${
                        selectedFile === file ? "bg-gray-200" : "hover:bg-gray-100"
                    } ${excludedFiles.has(file.path) ? "opacity-50" : ""} group`}
                >
                    <span onClick={() => setSelectedFile(file)} className="flex-grow">
                        {file.path}
                    </span>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleExcludeFile(file.path);
                        }}
                        className={`ml-2 focus:outline-none ${
                            excludedFiles.has(file.path) ? "" : "hidden group-hover:block"
                        }`}
                        title={excludedFiles.has(file.path) ? "Include in PR" : "Exclude from PR"}
                    >
                        <XCircleIcon
                            className={`h-5 w-5 ${
                                excludedFiles.has(file.path)
                                    ? "text-red-500"
                                    : "text-gray-400 hover:text-red-500"
                            }`}
                        />
                    </button>
                </div>
            ))}
        </div>
    );

    useEffect(() => {
        const fetchOriginalContents = async () => {
            if (!codeChanges.modifiedFiles) return;

            setLoading(true);
            try {
                const updatedModifiedFiles = await Promise.all(
                    codeChanges.modifiedFiles.map(async (file) => {
                        const response = await fetch("/api/file", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                owner,
                                repo,
                                branch,
                                filePath: file.path,
                            }),
                        });

                        const { contents } = await response.json();

                        return { ...file, oldContents: contents };
                    })
                );

                codeChanges.modifiedFiles = updatedModifiedFiles;
            } catch (error) {
                console.error("Error fetching original contents:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchOriginalContents();
    }, [codeChanges]);

    const renderFileContent = () => {
        if (!selectedFile) {
            return (
                <div className="p-4 text-center text-gray-500">
                    Select a file to view its content
                </div>
            );
        }

        return (
            <div className="p-4">
                <h3 className="font-semibold mb-2">{selectedFile.path}</h3>

                {selectedFile.thoughts && (
                    <div className="mb-4 p-2 bg-yellow-50 border border-yellow-100 rounded">
                        <h4 className="font-medium mb-1">Thoughts:</h4>
                        <p>{selectedFile.thoughts}</p>
                    </div>
                )}

                {renderFileTypeContent()}
            </div>
        );
    };

    const renderContent = (code: string) => {
        const highlighted = hljs.highlightAuto(code).value;
        return <pre dangerouslySetInnerHTML={{ __html: highlighted }} />;
    };

    const renderFileTypeContent = () => {
        if (selectedFile && "oldContents" in selectedFile && showDiff) {
            return (
                <ReactDiffViewer
                    oldValue={selectedFile.oldContents!} // Using non-null assertion
                    newValue={selectedFile.content!} // Using non-null assertion
                    splitView={false}
                    hideLineNumbers={true}
                    showDiffOnly={false}
                    compareMethod={DiffMethod.WORDS}
                    renderContent={renderContent}
                />
            );
        } else if (selectedFile && "content" in selectedFile) {
            return renderContent(selectedFile.content!);
        } else if (
            selectedFile &&
            codeChanges.deletedFiles?.includes(selectedFile as DeletedFile)
        ) {
            return <p className="text-red-500">This file has been deleted.</p>;
        }
        return null;
    };

    return (
        <div className="flex h-full">
            <div className="w-1/3 overflow-y-auto border-r p-4">
                <h2 className="text-xl font-bold mb-4">{codeChanges.title}</h2>
                {codeChanges.newFiles &&
                    codeChanges.newFiles.length > 0 &&
                    renderFileList(codeChanges.newFiles, "New Files")}
                {codeChanges.modifiedFiles &&
                    codeChanges.modifiedFiles.length > 0 &&
                    renderFileList(codeChanges.modifiedFiles, "Modified Files")}
                {codeChanges.deletedFiles &&
                    codeChanges.deletedFiles.length > 0 &&
                    renderFileList(codeChanges.deletedFiles, "Deleted Files")}
            </div>
            <div className="w-2/3 overflow-y-auto">
                {loading ? (
                    <div className="p-4 text-center text-gray-500">Loading...</div>
                ) : (
                    renderFileContent()
                )}
            </div>
        </div>
    );
};

export default CodeViewer;
