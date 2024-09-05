import { EXCLUDE_PATTERNS } from "@/constants";
import { GitHubService } from "./GitHubService";
import { DatabaseService } from "../db/SupDatabaseService";

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
        taskId: string = ""
    ): Promise<FileDetails[]> {
        let result: FileDetails[] = [];

        // get files from the repo
        const files = await this.ghService.listRepoFiles(owner, repo, ref);
        // get files from the database
        const savedFiles = await this.dbService.getAllFileDetails(owner, repo, ref);

        // create a map of saved files
        const savedFilesMap = new Map<string, FileDetails>();
        for (const savedFile of savedFiles) {
            savedFilesMap.set(savedFile.path, savedFile);
        }

        // apply exclusion filter
        const filteredFiles = files.filter(
            (file) => file.path && !RepositoryService.shouldExclude(file.path)
        );

        for (const file of filteredFiles) {
            // make sure all props exist on the file
            if (!file.path || !file.sha) {
                continue;
            }

            // check if file already exists in the database
            const savedFile = savedFilesMap.get(file.path);

            // if exists and hash matches, use the saved file
            if (savedFile && savedFile.commitHash === file.sha) {
                // console.log("Using saved file >>", file.path, savedFile.commitHash);
                result.push(savedFile);
            } else {
                // otherwise, create a new file
                // console.log("New or updated file >> ", file.path);
                result.push({
                    name: file.path.split("/").pop()!,
                    path: file.path!,
                    owner,
                    repo,
                    ref,
                    content: "",
                    commitHash: file.sha,
                    embeddings: [],
                    tokenCount: 0,
                });
            }
        }

        return result;
    }

    async fetchFiles(files: FileDetails[]) {
        const promises = files.map(async (file) => {
            // no need to fetch content if it's already there
            if (file.content) {
                // console.log("file content already fetched", file.path);
                return file;
            }

            // console.log("fetching file content", file.path);
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
