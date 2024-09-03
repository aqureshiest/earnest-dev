interface CommitData {
    sha: string;
    date: string;
    author: string;
    additions: number;
    deletions: number;
    files_changed: string[]; // New: List of files changed
}

interface PullRequestData {
    number: number;
    author: string;
    created_at: string;
    merged_at: string | null;
    closed_at: string | null; // New: To track abandoned PRs
    first_review_at: string | null;
    time_to_first_review: number | null; // New: Calculated field
    time_to_merge: number | null; // New: Calculated field
    changed_files: number;
    additions: number;
    deletions: number;
    reviewers: string[];
    review_comments: number; // New: Number of review comments
    labels: string[]; // New: Labels associated with the PR
}

interface ReviewData {
    pull_request_number: number;
    reviewer: string;
    submitted_at: string;
    comments: number; // New: Number of comments in this review
    lines_reviewed: number; // New: Approximate lines of code reviewed
}

interface RepositoryData {
    name: string;
    commits: CommitData[];
    pullRequests: PullRequestData[];
    reviews: ReviewData[];
    commit_frequency: { date: string; count: number }[]; // New: Commit frequency over time
    pr_merge_frequency: { date: string; count: number }[]; // New: PR merge frequency over time
}

interface UserData {
    login: string;
    commits: number;
    pullRequestsOpened: number;
    pullRequestsReviewed: number;
    averagePRSize: number; // New: Average PR size
    averageTimeToReview: number; // New: Average time to review
    favoriteFiles: { file: string; frequency: number }[]; // New: Favorite files based on commit frequency
}

interface TeamData {
    users: UserData[];
    collaborationMatrix: { [reviewer: string]: { [author: string]: number } }; // New: Who reviews whose code
    teamVelocity: number; // New: Team velocity (e.g., PRs merged per week)
    workDistribution: { [user: string]: number }; // New: Distribution of work across team members
}

interface CacheData {
    timestamp: number;
    data: any;
}

// types/metricsData.ts

interface CommitFrequencyData {
    date: string;
    frequency: number;
}

interface PRMetricsData {
    developer: string;
    frequency: number;
    averageSize: number;
    mergeRate: number;
}

interface TeamVelocityData {
    sprint: string;
    velocity: number;
}

interface CollaborationMatrixData {
    [reviewer: string]: {
        [author: string]: number;
    };
}

interface PRMergeFrequencyData {
    date: string;
    count: number;
}

interface AverageCommentsPerPRData {
    name: string;
    value: number;
}

interface AreasOfExpertiseData {
    [developer: string]: string[];
}

interface MetricsData {
    commitFrequency: CommitFrequencyData[];
    prMetrics: PRMetricsData[];
    teamVelocity: TeamVelocityData[];
    collaborationMatrix: CollaborationMatrixData;
    prMergeFrequency: PRMergeFrequencyData[];
    averageCommentsPerPR: AverageCommentsPerPRData[];
    areasOfExpertise: AreasOfExpertiseData;
}
