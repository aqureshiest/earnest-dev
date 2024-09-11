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

// request types

interface TaskRequest {
    taskId: string;
    task: string;
    model: string;
}

interface CodingTaskRequest extends TaskRequest {
    owner: string;
    repo: string;
    branch: string;
    files: FileDetails[];
    params?: any;
}

// specifications types

interface Specifications {
    specifications: Specification[];
}

interface Specification {
    title: string;
    summary: string;
    key_steps: string[];
    considerations: string[];
}

// implementation plan types

interface ImplementationPlan {
    steps: Step[];
}

interface Step {
    title: string;
    thoughts: string;
    files: FileChanges[];
}

interface FileChanges {
    path: string;
    operation: "new" | "modify" | "delete";
    todos: string[];
}

// generated code types

interface CodeChanges {
    title: string;
    newFiles: NewFile[];
    modifiedFiles: ModifiedFile[];
    deletedFiles: DeletedFile[];
}

interface NewFile {
    path: string;
    thoughts: string;
    content: string;
}

interface ModifiedFile {
    path: string;
    thoughts: string;
    content: string;
}

interface DeletedFile {
    path: string;
}

// ai response

interface AIResponse {
    response: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
}
