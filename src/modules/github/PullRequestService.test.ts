import PullRequestService from "@/modules/github/PullRequestService";
import { DatabaseService } from "@/modules/db/SupDatabaseService";

jest.mock("@/modules/db/SupDatabaseService");

describe("PullRequestService", () => {
    let prService: PullRequestService;
    const owner = "testOwner";
    const repo = "testRepo";
    const branch = "main";
    const dbService = new DatabaseService();

    beforeEach(() => {
        prService = new PullRequestService(owner, repo, branch);
    });

    it("should retrieve files from the database if commit SHA is unchanged", async () => {
        const commitSHA = "abc123";
        dbService.getBranchCommitSHA = jest.fn().mockResolvedValue(commitSHA);
        dbService.getFilesByCommitSHA = jest.fn().mockResolvedValue([{ path: "file1.js", content: "console.log('test');" }]);

        const result = await prService.createPullRequest({ newFiles: [], modifiedFiles: [], deletedFiles: [] }, "Test PR", "This is a test PR");

        expect(dbService.getBranchCommitSHA).toHaveBeenCalledWith(owner, repo, branch);
        expect(dbService.getFilesByCommitSHA).toHaveBeenCalledWith(commitSHA);
        expect(result).toBeDefined();
    });

    it("should fetch all files if commit SHA has changed", async () => {
        const oldCommitSHA = "abc123";
        const newCommitSHA = "def456";
        dbService.getBranchCommitSHA = jest.fn().mockResolvedValue(oldCommitSHA);
        dbService.getCurrentBranchCommitSHA = jest.fn().mockResolvedValue(newCommitSHA);
        dbService.getAllFiles = jest.fn().mockResolvedValue([{ path: "file2.js", content: "console.log('test2');" }]);

        const result = await prService.createPullRequest({ newFiles: [], modifiedFiles: [], deletedFiles: [] }, "Test PR", "This is a test PR");

        expect(dbService.getBranchCommitSHA).toHaveBeenCalledWith(owner, repo, branch);
        expect(dbService.getCurrentBranchCommitSHA).toHaveBeenCalledWith(owner, repo, branch);
        expect(dbService.getAllFiles).toHaveBeenCalled();
        expect(result).toBeDefined();
    });
});