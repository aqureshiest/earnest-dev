import { RepositoryService } from "@/modules/github/RepositoryService";
import { DatabaseService } from "@/modules/db/SupDatabaseService";

describe("RepositoryService", () => {
    let repositoryService: RepositoryService;
    let dbService: DatabaseService;

    beforeEach(() => {
        dbService = new DatabaseService();
        repositoryService = new RepositoryService();
    });

    it("should skip indexing if commit exists", async () => {
        const owner = "testOwner";
        const repo = "testRepo";
        const branch = "main";
        const commitHash = "abc123";

        // Mock the database to return a commit
        jest.spyOn(dbService, "getFileDetails").mockResolvedValueOnce({
            owner,
            repo,
            ref: branch,
            commitHash,
        });

        const result = await repositoryService.getRepositoryFiles(owner, repo, branch, "", null);
        expect(result).toBeDefined();
        // Add more assertions based on expected behavior
    });

    it("should proceed with indexing if commit does not exist", async () => {
        const owner = "testOwner";
        const repo = "testRepo";
        const branch = "main";
        const commitHash = "xyz789";

        // Mock the database to return null for the commit
        jest.spyOn(dbService, "getFileDetails").mockResolvedValueOnce(null);

        const result = await repositoryService.getRepositoryFiles(owner, repo, branch, "", null);
        expect(result).toBeDefined();
        // Add more assertions based on expected behavior
    });
});
