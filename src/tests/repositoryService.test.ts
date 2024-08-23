import { RepositoryService } from "@/modules/github/RepositoryService";
import { DatabaseService } from "@/modules/db/SupDatabaseService";

describe("RepositoryService", () => {
    let repositoryService: RepositoryService;
    let dbService: DatabaseService;

    beforeEach(() => {
        dbService = new DatabaseService();
        repositoryService = new RepositoryService();
    });

    it("should skip indexing if the commit has not changed", async () => {
        // Mock the database response to return a commit hash
        jest.spyOn(dbService, "getFileDetails").mockResolvedValueOnce({
            commitHash: "abc123",
        });

        const result = await repositoryService.getRepositoryFiles("owner", "repo", "main", "", null);
        expect(result).toBeDefined();
        // Add assertions to verify that indexing was skipped
    });

    it("should save the new commit after successful indexing", async () => {
        // Mock the indexing process and verify that the commit is saved
        const commitHash = "def456";
        await repositoryService.indexRepository("owner", "repo", "main", commitHash);
        // Add assertions to verify that the commit was saved correctly
    });
});
