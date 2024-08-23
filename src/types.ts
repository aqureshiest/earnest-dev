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

interface Specifications {
    specifications: Specification[];
}

interface Specification {
    title: string;
    thoughts: string;
    keySteps: string[];
}

interface ImplementationPlan {
    implementationPlan: Step[];
}

interface Step {
    step: string;
    thoughts: string;
    files: FileChanges[];
}

interface FileChanges {
    path: string;
    status: "new" | "modified" | "deleted";
    todos: string[];
}

interface CodeChanges {
    prTitle: string;
    newFiles: FileChange[];
    modifiedFiles: FileChange[];
    deletedFiles: string[];
}

interface FileChange {
    path: string;
    thoughts: string;
    content: string;
}

interface AIResponse {
    response: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
}
