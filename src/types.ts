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
    author: string; // New field for author information
}
