import { DatabaseService } from "@/modules/db/SupDatabaseService";

describe("DatabaseService", () => {
    let dbService: DatabaseService;

    beforeAll(() => {
        dbService = new DatabaseService();
    });

    it("should save and retrieve branch commit", async () => {
        const owner = "testOwner";
        const repo = "testRepo";
        const branch = "main";
        const commitHash = "abc123";

        await dbService.saveBranchCommit(owner, repo, branch, commitHash);
        const retrievedCommit = await dbService.getBranchCommit(owner, repo, branch);

        expect(retrievedCommit).toEqual(commitHash);
    });
});
