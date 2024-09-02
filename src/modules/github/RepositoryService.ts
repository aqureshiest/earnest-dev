import { EXCLUDE_PATTERNS } from "@/constants";
import { GitHubService } from "./GitHubService";
import { DatabaseService } from "../db/SupDatabaseService";
import { sendTaskUpdate } from "@/app/api/generate/route";

export class RepositoryService {
    private ghService: GitHubService;
    private dbService: DatabaseService;

    constructor() {
        this.ghService = new GitHubService();
        this.dbService = new DatabaseService();
    }

    async getRepositoryFiles(
        owner: string,
        repo: string,
        ref: string = "main",
        path: string = "",
        taskId: string
    ): Promise<FileDetails[]> {
        let result: FileDetails[] = [];

        const files = await this.ghService.getFiles(owner, repo, ref, path);
        // exclude files that match the patterns
        const filteredFiles = files.filter((file) => !RepositoryService.shouldExclude(file.name));

        // process each file
        for (const file of filteredFiles) {
            if (file.type === "file") {
                // send message
                sendTaskUpdate(taskId, "progress", `file:${file.path}`);

                // check if we already have this file in the store
                const savedFile = await this.dbService.getFileDetails(owner, repo, ref, file.path);
                // make sure the commit hash is the same
                if (savedFile && savedFile.commitHash === file.sha) {
                    console.log("Using saved file >>", file.path, savedFile.commitHash);
                    result.push(savedFile);
                } else {
                    console.log("New file >> ", file.path);
                    result.push({
                        name: file.name,
                        path: file.path,
                        owner,
                        repo,
                        ref,
                        content: "",
                        commitHash: file.sha,
                        embeddings: [],
                        tokenCount: 0,
                    });
                }
            } else if (file.type === "dir" && !file.name.startsWith(".")) {
                const nestedFiles = await this.getRepositoryFiles(
                    owner,
                    repo,
                    ref,
                    file.path,
                    taskId
                );
                result.push(...nestedFiles);
            }
        }

        return result;
    }

    async fetchFiles(files: FileDetails[]) {
        const promises = files.map(async (file) => {
            // no need to fetch content if it's already there
            if (file.content) {
                console.log("file content already fetched", file.path);
                return file;
            }

            console.log("fetching file content", file.path);
            const content = await this.ghService.readFile(
                file.owner,
                file.repo,
                file.ref,
                file.path
            );

            if (!("content" in content)) {
                throw new Error("No content found in file");
            }

            return {
                ...file,
                content: Buffer.from(content.content, "base64").toString("utf-8"),
            };
        });

        return Promise.all(promises);
    }

    async isBranchSynced(owner: string, repo: string, ref: string = "main") {
        const dbCommitHash = await this.dbService.getBranchCommit(owner, repo, ref);
        const ghBranch = await this.ghService.getBranch(owner, repo, ref);

        return dbCommitHash === ghBranch.commit.sha;
    }

    async syncBranch(owner: string, repo: string, ref: string = "main", files: FileDetails[]) {
        const ghBranch = await this.ghService.getBranch(owner, repo, ref);

        // save all files
        files.forEach(async (file) => {
            await this.dbService.saveFileDetails(file);
        });

        // save branch commit (for next iteration)
        await this.dbService.saveBranchCommit(owner, repo, ref, ghBranch.commit.sha);
    }

    static shouldExclude(filePath: string): boolean {
        return EXCLUDE_PATTERNS.some((pattern) => {
            if (pattern.endsWith("/")) {
                return filePath.includes(pattern);
            } else {
                return filePath.endsWith(pattern);
            }
        });
    }
}
