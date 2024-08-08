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

    async getRepositoryFiles(branch: StoredBranch, path: string = ""): Promise<FileDetails[]> {
        let result: FileDetails[] = [];

        if (!branch || !branch.id) {
            throw new Error("Branch not provided");
        }

        const files = await this.ghService.getFiles(branch.owner, branch.repo, branch.ref, path);
        // exclude files that match the patterns
        const filteredFiles = files.filter((file) => !RepositoryService.shouldExclude(file.name));

        // process each file
        for (const file of filteredFiles) {
            if (file.type === "file") {
                // check if we already have this file in the store
                const savedFile = await this.dbService.getFileDetails(branch.id, file.path);
                // make sure the commit hash is the same
                if (savedFile && savedFile.commitHash === file.sha) {
                    console.log("Using saved file >>", file.path, savedFile.commitHash);
                    result.push({
                        ...file,
                        branch,
                    });
                } else {
                    console.log("New file >> ", file.path);
                    result.push({
                        name: file.name,
                        path: file.path,
                        branch,
                        content: "",
                        commitHash: file.sha,
                        embeddings: [],
                        tokenCount: 0,
                    });
                }
            } else if (file.type === "dir" && !file.name.startsWith(".")) {
                const nestedFiles = await this.getRepositoryFiles(branch, file.path);
                result.push(...nestedFiles);
            }
        }

        return result;
    }

    async fetchFiles(branch: StoredBranch, files: FileDetails[]) {
        const promises = files.map(async (file) => {
            // no need to fetch content if it's already there
            if (file.content) {
                console.log("file content already fetched", file.path);
                return file;
            }

            console.log("fetching file content", file.path);
            const content = await this.ghService.readFile(
                branch.owner,
                branch.repo,
                branch.ref,
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
