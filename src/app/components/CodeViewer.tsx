import React, { useEffect, useState } from "react";
import hljs from "highlight.js";
import "highlight.js/styles/github.css";
import ReactDiffViewer, { DiffMethod } from "react-diff-viewer-continued";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface BaseFileView {
    path: string;
    thoughts?: string;
    content?: string;
    oldContents?: string;
}

type NewFileView = BaseFileView & {
    content: string;
};

type ModifiedFileView = BaseFileView & {
    oldContents: string;
    content: string;
};

type DeletedFileView = BaseFileView;

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
    const [selectedFile, setSelectedFile] = useState<BaseFileView | null>(null);
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
            <h3 className="text-sm font-medium text-muted-foreground mb-2">{category}</h3>
            {files.map((file) => (
                <div
                    key={file.path}
                    className={`p-2 cursor-pointer flex items-center justify-between rounded-md ${
                        selectedFile === file ? "bg-accent" : "hover:bg-accent/50"
                    } ${excludedFiles.has(file.path) ? "opacity-50" : ""} group`}
                >
                    <span onClick={() => setSelectedFile(file)} className="flex-grow text-sm">
                        {file.path}
                    </span>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleExcludeFile(file.path);
                        }}
                        className={`ml-2 ${
                            excludedFiles.has(file.path) ? "" : "opacity-0 group-hover:opacity-100"
                        }`}
                        title={excludedFiles.has(file.path) ? "Include in PR" : "Exclude from PR"}
                    >
                        <X className="h-4 w-4" />
                    </Button>
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
                <div className="p-4 text-center text-muted-foreground">
                    Select a file to view its content
                </div>
            );
        }

        return (
            <div className="p-4">
                <h3 className="text-lg font-semibold mb-2">{selectedFile.path}</h3>

                {selectedFile.thoughts && (
                    <Card className="mb-4">
                        <CardHeader>
                            <CardTitle className="text-sm">Thoughts</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm">{selectedFile.thoughts}</p>
                        </CardContent>
                    </Card>
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
                    oldValue={selectedFile.oldContents!}
                    newValue={selectedFile.content!}
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
            return <p className="text-destructive">This file has been deleted.</p>;
        }
        return null;
    };

    return (
        <Card className="flex h-full">
            <div className="w-1/3 border-r overflow-y-auto">
                <CardHeader>
                    <CardTitle>{codeChanges.title}</CardTitle>
                </CardHeader>
                <CardContent>
                    {codeChanges.newFiles &&
                        codeChanges.newFiles.length > 0 &&
                        renderFileList(codeChanges.newFiles, "New Files")}
                    {codeChanges.modifiedFiles &&
                        codeChanges.modifiedFiles.length > 0 &&
                        renderFileList(codeChanges.modifiedFiles, "Modified Files")}
                    {codeChanges.deletedFiles &&
                        codeChanges.deletedFiles.length > 0 &&
                        renderFileList(codeChanges.deletedFiles, "Deleted Files")}
                </CardContent>
            </div>
            <div className="w-2/3 overflow-y-auto">
                {loading ? (
                    <div className="p-4 text-center text-muted-foreground">Loading...</div>
                ) : (
                    renderFileContent()
                )}
            </div>
        </Card>
    );
};

export default CodeViewer;
