import { PrepareCodebase } from "@/modules/ai/PrepareCodebase";
import { GitHubService } from "@/modules/github/GitHubService";
import { LLM_MODELS } from "@/modules/utils/llmInfo";

interface FileMetadata {
    filePath: string;
    last_modified: string;
    commit_count: number;
    file_size: number;
}

const githubService = new GitHubService();

const getRepoMetadata = async (
    owner: string,
    repo: string,
    branch: string,
    files: FileDetails[]
) => {
    const metadata: FileMetadata[] = [];

    for (const file of files) {
        const codeExtensions = [".ts", ".js", ".py", ".tsx", ".sql"];
        // limit to code files
        if (!codeExtensions.some((ext) => file.path.endsWith(ext))) {
            continue;
        }

        // get commits for this file
        const commits = await githubService.listCommits(owner, repo, branch, file.path);

        // get last modified date
        const lastModified = commits.length > 0 ? commits[0].commit?.author?.date : "";

        // count commits
        const commitCount = commits.length;

        // get file size
        const fileSize = file.content.length;

        // add to metadata
        metadata.push({
            filePath: file.path,
            last_modified: lastModified || "",
            commit_count: commitCount,
            file_size: fileSize,
        });
    }

    return metadata;
};

const sortFilesByImportance = (metadata: FileMetadata[]): FileMetadata[] => {
    const commitWeight = 0.5; // 50% weight for commit count
    const sizeWeight = 0.3; // 30% weight for file size
    const lastModifiedWeight = 0.2; // 20% weight for last modified date

    // Find the maximum values for normalization
    const maxCommitCount = Math.max(...metadata.map((file) => file.commit_count));
    const maxFileSize = Math.max(...metadata.map((file) => file.file_size));
    const oldestModifiedDate = Math.min(
        ...metadata.map((file) => new Date(file.last_modified).getTime())
    );

    console.log(maxCommitCount, maxFileSize, oldestModifiedDate);

    return (
        metadata
            .map((file) => {
                // Normalize commit count, file size, and last modified date
                const normalizedCommitCount =
                    maxCommitCount > 0 ? file.commit_count / maxCommitCount : 0;
                const normalizedFileSize = maxFileSize > 0 ? file.file_size / maxFileSize : 0;
                const normalizedLastModified =
                    oldestModifiedDate > 0
                        ? (new Date(file.last_modified).getTime() - oldestModifiedDate) /
                          (Date.now() - oldestModifiedDate)
                        : 0;

                // Calculate the importance score
                const importanceScore =
                    normalizedCommitCount * commitWeight +
                    normalizedFileSize * sizeWeight +
                    normalizedLastModified * lastModifiedWeight;

                return { ...file, importanceScore };
            })
            // Sort by importance score in descending order
            .sort((a, b) => b.importanceScore - a.importanceScore)
    );
};

export const codeMetadata = async () => {
    const codebase = new PrepareCodebase();
    const request: CodingTaskRequest = {
        taskId: Date.now().toString(),
        owner: "aqureshiest",
        repo: "bookstore",
        branch: "main",
        task: "",
        model: LLM_MODELS.AWS_BEDROCK_CLAUDE_35_HAIKU_V2.id,
        files: [],
        params: {},
    };

    const files = await codebase.prepare(request);
    console.log(files.length);

    const meta = await getRepoMetadata(request.owner, request.repo, request.branch, files);

    const mostImportantFiles = sortFilesByImportance(meta);
    console.log(mostImportantFiles);
    // print the top 20%
    // const topFiles = mostImportantFiles.slice(0, Math.ceil(mostImportantFiles.length * 0.2));
    // console.log(topFiles);
};
