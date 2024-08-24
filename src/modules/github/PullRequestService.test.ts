import PullRequestService from "@/modules/github/PullRequestService";
import { DatabaseService } from "@/modules/db/SupDatabaseService";

jest.mock("@/modules/db/SupDatabaseService");

describe("PullRequestService", () => {
    let prService: PullRequestService;
    const owner = "testOwner";
    const repo = "testRepo";
    const branch = "testBranch";

    beforeEach(() => {
        prService = new PullRequestService(owner, repo, branch);
    });

    it("should retrieve files from the database if commit SHA matches", async () => {
        const mockCommitSHA = "abc123";
        const mockFiles = [{ path: "file1.js", content: "console.log('test');" }];
        
        (DatabaseService.prototype.getFileDetails as jest.Mock).mockResolvedValueOnce(mockFiles);
        (DatabaseService.prototype.getBranchCommitSHA as jest.Mock).mockResolvedValueOnce(mockCommitSHA);

        const result = await prService.createPullRequest(/* parameters */);
        
        expect(result).toEqual(mockFiles);
        expect(DatabaseService.prototype.getFileDetails).toHaveBeenCalled();
    });

    it("should fetch all files if commit SHA has changed", async () => {
        const mockNewCommitSHA = "def456";
        
        (DatabaseService.prototype.getBranchCommitSHA as jest.Mock).mockResolvedValueOnce("abc123");
        (DatabaseService.prototype.getAllFileDetails as jest.Mock).mockResolvedValueOnce([{ path: "file2.js", content: "console.log('new test');" }]);

        const result = await prService.createPullRequest(/* parameters */);
        
        expect(result).toEqual([{ path: "file2.js", content: "console.log('new test');" }]);
        expect(DatabaseService.prototype.getAllFileDetails).toHaveBeenCalled();
    });

    it("should handle errors when retrieving from the database", async () => {
        (DatabaseService.prototype.getBranchCommitSHA as jest.Mock).mockRejectedValueOnce(new Error("Database error"));

        await expect(prService.createPullRequest(/* parameters */)).rejects.toThrow("Database error");
    });
});