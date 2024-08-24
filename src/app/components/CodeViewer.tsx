import React, { useState } from "react";
import hljs from "highlight.js";
import "highlight.js/styles/github.css";

const CodeViewer = ({ codeChanges }: { codeChanges: CodeChanges }) => {
    const [selectedFile, setSelectedFile] = useState<NewFile | ModifiedFile | DeletedFile>();

    const renderFileList = (
        files: NewFile[] | ModifiedFile[] | DeletedFile[],
        category: string
    ) => (
        <div className="mb-4">
            <h3 className="font-semibold mb-2">{category}</h3>
            {files.map((file) => (
                <div
                    key={file.path}
                    className={`p-2 cursor-pointer ${
                        selectedFile === file ? "bg-gray-200" : "hover:bg-gray-100"
                    }`}
                    onClick={() => setSelectedFile(file)}
                >
                    {file.path}
                </div>
            ))}
        </div>
    );

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
                {selectedFile ? (
                    <div className="p-4">
                        <h3 className="font-semibold mb-2">{selectedFile.path}</h3>
                        {selectedFile.thoughts && (
                            <div className="mb-4 p-2 bg-yellow-50 border border-yellow-100 rounded">
                                <h4 className="font-medium mb-1">Thoughts:</h4>
                                <p>{selectedFile.thoughts}</p>
                            </div>
                        )}
                        {selectedFile.content ? (
                            <pre>
                                <code
                                    dangerouslySetInnerHTML={{
                                        __html: hljs.highlight("javascript", selectedFile.content)
                                            .value,
                                    }}
                                />
                            </pre>
                        ) : (
                            <p className="text-red-500">This file has been deleted.</p>
                        )}
                    </div>
                ) : (
                    <div className="p-4 text-center text-gray-500">
                        Select a file to view its content
                    </div>
                )}
            </div>
        </div>
    );
};

export default CodeViewer;
