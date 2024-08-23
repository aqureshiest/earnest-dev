import { DatabaseService } from "@/modules/db/SupDatabaseService";
import { RepositoryService } from "@/modules/github/RepositoryService";

describe("Branch Commits Table Functionality", () => {
    const dbService = new DatabaseService();
    const repoService = new RepositoryService();

    beforeAll(async () => {
        // Setup: Create the necessary tables and data
        await dbService.createBranchCommitsTable();
    });

    afterAll(async () => {
        // Cleanup: Drop the table after tests
        await dbService.dropBranchCommitsTable();
    });

    test("should save commit hash to the branch commits table", async () => {
        const commitHash = "abc123";
        const owner = "testOwner";
        const repo = "testRepo";
        const branch = "main";

        await dbService.saveBranchCommit(owner, repo, branch, commitHash);
        const savedCommit = await dbService.getBranchCommit(owner, repo, branch);

        expect(savedCommit).toEqual(commitHash);
    });

    test("should skip indexing if commit hash matches", async () => {
        const commitHash = "abc123";
        const owner = "testOwner";
        const repo = "testRepo";
        const branch = "main";

        await dbService.saveBranchCommit(owner, repo, branch, commitHash);
        const shouldIndex = await repoService.shouldIndexRepository(owner, repo, branch, commitHash);

        expect(shouldIndex).toBe(false);
    });
});