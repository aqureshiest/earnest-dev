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

interface JiraTicketsRequest extends CodingTaskRequest {
    tddContent: string;
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

// TDD to Feature breakdown types

interface FeatureBreakdown {
    feature: Feature[];
}

interface Feature {
    name: string;
    description: string;
    tasks: Task[];
}

interface Task {
    name: string;
    description: string;
    technicalDetails: Detail[];
    subtasks: Subtask[];
    dependencies?: string;
    complexity: "Low" | "Medium" | "High";
}

interface Detail {
    detail: string;
}

interface Subtask {
    name: string;
    description: string;
    technicalDetails: Detail[];
}

// Jira items types

interface JiraItems {
    epic: Epic;
    tickets: Ticket[];
}

interface Epic {
    title: string;
    user_story: string;
    description: string;
    technical_details: string;
    affected_components: Component[];
}

interface Component {
    component: string;
}

interface Ticket {
    title: string;
    user_story: string;
    acceptance_criteria: Criterion[];
    description: string;
    technical_details: string;
    affected_files: File[];
    steps: Step[];
    dependencies?: string;
    risks_and_challenges?: string;
    estimated_complexity: string;
    priority: "High" | "Medium" | "Low";
    effort: string;
    effortIn: "story points" | "hours";
}

interface Criterion {
    criterion: string;
}

interface File {
    file: string;
}

interface Step {
    step: string;
}
