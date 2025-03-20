import { EXCLUDE_PATTERNS } from "@/constants";
import { GitHubService } from "./GitHubService";
import { retryWithExponentialBackoff } from "../utils/retryWithExponentialBackoff";
import { RepositoryDataService } from "../db/RepositoryDataService";
import { reportError } from "../bugsnag/report";

interface FetchError {
    path: string;
    error: Error;
    attempt: number;
    timestamp: Date;
}

const MAX_CONSECUTIVE_FAILURES = 3;
const MAX_TOTAL_FAILURES = 5;
const DEFAULT_CONCURRENCY = 25;

export class RepositoryService {
    private ghService: GitHubService;
    private dataService: RepositoryDataService;

    private failureLog: FetchError[] = [];
    private consecutiveFailures = 0;

    constructor() {
        this.ghService = new GitHubService();
        this.dataService = new RepositoryDataService();
    }

    private logFailure(path: string, error: Error, attempt: number) {
        const fetchError: FetchError = {
            path,
            error,
            attempt,
            timestamp: new Date(),
        };
        this.failureLog.push(fetchError);
        this.consecutiveFailures++;

        console.error("Failure:", JSON.stringify(fetchError, null, 2));

        // Bugsnag reporting
        reportError(error, {
            repository: {
                path,
                attempt,
                consecutiveFailures: this.consecutiveFailures,
                totalFailures: this.failureLog.length,
            },
            severity: "warning",
        });

        if (this.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            throw new Error(
                `Stopping due to ${MAX_CONSECUTIVE_FAILURES} consecutive failures in pulling files`
            );
        }
        if (this.failureLog.length >= MAX_TOTAL_FAILURES) {
            throw new Error(
                `Stopping due to ${MAX_TOTAL_FAILURES} total failures in pulling files`
            );
        }
    }

    async getRepositoryFiles(
        owner: string,
        repo: string,
        ref: string = "main"
    ): Promise<FileDetails[]> {
        let result: FileDetails[] = [];

        // get files from the repo
        const files = await this.ghService.listRepoFiles(owner, repo, ref);
        // get files from the database
        const savedFiles = await this.dataService.getAllFileDetails(owner, repo, ref);

        // Get a mapping of which files have chunks
        const filesWithChunks = await this.dataService.getFilesWithChunks(owner, repo, ref);
        const filesWithChunksSet = new Set(filesWithChunks.map((f) => f.path));

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
            const hasChunks = filesWithChunksSet.has(file.path);

            // if exists, hash matches, AND has chunks, use the saved file
            if (savedFile && savedFile.commitHash === file.sha && hasChunks) {
                result.push(savedFile);
            } else {
                // otherwise, create a new file that needs processing
                result.push({
                    name: file.path.split("/").pop()!,
                    path: file.path!,
                    owner,
                    repo,
                    ref,
                    content: "",
                    commitHash: file.sha,
                    tokenCount: 0,
                    needsProcessing: true,
                });
            }
        }

        return result;
    }

    async fetchFilesAsync(files: FileDetails[]) {
        const promises = files.map((file) =>
            retryWithExponentialBackoff(async () => {
                // no need to fetch content if it's already there
                if (file.content) {
                    // console.log("file content already fetched", file.path);
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
            })
        );

        return Promise.all(promises);
    }

    private async fetchSingleFile(file: FileDetails): Promise<FileDetails> {
        if (file.content) {
            console.log(`Using cached content for ${file.path}`);
            return file;
        }

        console.log(`Fetching content for ${file.path}`);
        const content = await this.ghService.readFile(file.owner, file.repo, file.ref, file.path);

        if (!("content" in content)) {
            throw new Error(`No content found in file ${file.path}`);
        }

        return {
            ...file,
            content: Buffer.from(content.content, "base64").toString("utf-8"),
        };
    }

    async fetchFiles(
        files: FileDetails[],
        maxConcurrent: number = DEFAULT_CONCURRENCY
    ): Promise<FileDetails[]> {
        const results: FileDetails[] = [];
        this.failureLog = [];
        this.consecutiveFailures = 0;
        let activePromises: Array<{ promise: Promise<void>; path: string }> = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            // Create promise for this file
            const filePromise = retryWithExponentialBackoff(async () => {
                const result = await this.fetchSingleFile(file);
                results.push(result);
                this.consecutiveFailures = 0; // Reset on success
            }, `Fetching ${file.path}`).catch((error) => {
                this.logFailure(
                    file.path,
                    error instanceof Error ? error : new Error(String(error)),
                    1
                );
            });

            activePromises.push({
                promise: filePromise,
                path: file.path,
            });

            // If we've hit max concurrent or this is the last file,
            // wait for some promises to complete
            if (activePromises.length >= maxConcurrent || i === files.length - 1) {
                const completed = await Promise.race(
                    activePromises.map(async ({ promise, path }) => {
                        await promise;
                        return path;
                    })
                );

                // Remove the completed promise
                activePromises = activePromises.filter((p) => p.path !== completed);
            }
        }

        // Wait for any remaining promises
        if (activePromises.length > 0) {
            await Promise.all(activePromises.map((p) => p.promise));
        }

        if (this.failureLog.length > 0) {
            console.error(
                "Summary of failures:",
                JSON.stringify(
                    {
                        totalFailures: this.failureLog.length,
                        consecutiveFailures: this.consecutiveFailures,
                        failedPaths: this.failureLog.map((f) => f.path),
                        lastError: this.failureLog[this.failureLog.length - 1].error.message,
                    },
                    null,
                    2
                )
            );
        }

        return results;
    }

    async isBranchSynced(owner: string, repo: string, ref: string = "main") {
        const dbCommitHash = await this.dataService.getBranchCommit(owner, repo, ref);
        const ghBranch = await this.ghService.getBranch(owner, repo, ref);

        return dbCommitHash === ghBranch.commit.sha;
    }

    async syncBranch(owner: string, repo: string, ref: string = "main", files: FileDetails[]) {
        const ghBranch = await this.ghService.getBranch(owner, repo, ref);

        // save all files
        files.forEach(async (file) => {
            await this.dataService.saveFileDetails(file);
        });

        // save branch commit (for next iteration)
        await this.dataService.saveBranchCommit(owner, repo, ref, ghBranch.commit.sha);
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
