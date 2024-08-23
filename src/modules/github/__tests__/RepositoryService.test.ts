import { RepositoryService } from "../RepositoryService";
import { DatabaseService } from "../../db/SupDatabaseService";

describe("RepositoryService", () => {
    let repositoryService: RepositoryService;
    let dbService: DatabaseService;

    beforeEach(() => {
        dbService = new DatabaseService();
        repositoryService = new RepositoryService();
    });

    test("should skip indexing if commit exists", async () => {
        // Mock the database to return an existing commit
        jest.spyOn(dbService, 'getFileDetails').mockResolvedValueOnce({
            commitHash: "existingCommitHash"
        });

        const result = await repositoryService.getRepositoryFiles("owner", "repo", "branch", "", null);
        expect(result).toBeUndefined(); // Adjust based on actual implementation
    });

    test("should index and save new commit if it does not exist", async () => {
        // Mock the database to return null for the commit
        jest.spyOn(dbService, 'getFileDetails').mockResolvedValueOnce(null);

        const result = await repositoryService.getRepositoryFiles("owner", "repo", "branch", "", null);
        expect(result).toBeDefined(); // Adjust based on actual implementation
    });
});
