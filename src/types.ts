interface FileDetails {
    name: string;
    path: string;
    content: string;
    owner: string;
    repo: string;
    ref: string;
    commitHash: string;
    tokenCount: number;
    embeddings: number[];
}

interface FileChange {
    path: string;
    content: string;
}

interface CodeChanges {
    prTitle: string;
    newFiles: FileChange[];
    modifiedFiles: FileChange[];
    deletedFiles: string[];
}

interface AIResponse {
    response: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
}
