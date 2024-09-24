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
    params?: any;
}

interface CodingTaskRequest extends TaskRequest {
    owner: string;
    repo: string;
    branch: string;
    files: FileDetails[];
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

// TDD to Jira types

type TDDAnalysis = {
    overview: {
        projectSummary: string;
        mainObjectives: string[];
    };
    keyComponents: Array<{
        name: string;
        description: string;
    }>;
    detailedTasks: Array<{
        name: string;
        description: string;
        tasks: Array<{
            name: string;
            description: string;
            technicalDetails: string[];
            dependencies: string;
            estimatedComplexity: "Low" | "Medium" | "High";
        }>;
    }>;
    potentialChallengesAndRisks: Array<{
        description: string;
        mitigation: string;
    }>;
    additionalConsiderations: string[];
};

type JiraItems = {
    epic: {
        title: string;
        description: string;
        technicalDetails: string;
        estimatedComplexity: "Low" | "Medium" | "High";
        affectedComponents: string[];
    };
    tickets: Array<{
        title: string;
        description: string;
        technicalDetails: string;
        affectedFiles: string[];
        steps: string[];
        dependencies: string;
        risksAndChallenges: string;
        estimatedComplexity: "Low" | "Medium" | "High";
        priority: "High" | "Medium" | "Low";
        effort: string;
    }>;
};
