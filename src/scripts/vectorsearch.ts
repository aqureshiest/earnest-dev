import { loadEnvConfig } from "@next/env";
import { EmbeddingService } from "@/modules/ai/support/EmbeddingService";
import { RDSRepositoryDataService } from "@/modules/db/RDSRepositoryDataService";

// Load environment variables
loadEnvConfig("");

export const vectorsearch = async () => {
    const repo = new RDSRepositoryDataService();
    const embeddingService = new EmbeddingService();

    try {
        console.log("Starting vector similarity search test...\n");

        // Test data
        const testFiles: FileDetails[] = [
            {
                name: "authentication.ts",
                path: "/src/auth/authentication.ts",
                content:
                    "export class AuthService { async login(username: string, password: string) { /* ... */ } }",
                owner: "testuser",
                repo: "testrepo",
                ref: "main",
                commitHash: "abc123",
                embeddings: await embeddingService.generateEmbeddings(
                    "Authentication service for user login and password verification"
                ),
                tokenCount: 10,
            },
            {
                name: "database.ts",
                path: "/src/db/database.ts",
                content: "export class DatabaseService { async connect() { /* ... */ } }",
                owner: "testuser",
                repo: "testrepo",
                ref: "main",
                commitHash: "def456",
                embeddings: await embeddingService.generateEmbeddings(
                    "Database service for connecting to PostgreSQL database"
                ),
                tokenCount: 10,
            },
            {
                name: "logging.ts",
                path: "/src/utils/logging.ts",
                content: "export class LoggerService { async log(message: string) { /* ... */ } }",
                owner: "testuser",
                repo: "testrepo",
                ref: "main",
                commitHash: "ghi789",
                embeddings: await embeddingService.generateEmbeddings(
                    "Logging service for application monitoring and debugging"
                ),
                tokenCount: 10,
            },
        ];

        // Save test files
        console.log("Saving test files...");
        for (const file of testFiles) {
            await repo.saveFileDetails(file);
            console.log(`✓ Saved ${file.name}`);
        }
        console.log("\nAll test files saved successfully!\n");

        // Test queries
        const testQueries = [
            "How to implement user authentication",
            "Database connection configuration",
            "System logging and monitoring",
            "Something completely unrelated to any file",
        ];

        // Run similarity searches
        console.log("Testing similarity searches...\n");
        for (const query of testQueries) {
            console.log(`Query: "${query}"`);
            console.log("-".repeat(50));

            const results = await repo.findSimilar(query, "testuser", "testrepo", "main");

            if (results.length === 0) {
                console.log("No similar files found.");
            } else {
                results.forEach((result, index) => {
                    console.log(`${index + 1}. ${result.name}`);
                    console.log(`   Path: ${result.path}`);
                    console.log(`   Similarity: ${(result.similarity! * 100).toFixed(2)}%`);
                    console.log();
                });
            }
            console.log("-".repeat(50) + "\n");
        }

        // Clean up test data (optional)
        // Uncomment if you want to remove test data after running the test
        /*
        console.log('Cleaning up test data...');
        const cleanupQuery = `
            DELETE FROM filedetails 
            WHERE owner = 'testuser' 
            AND repo = 'testrepo' 
            AND ref = 'main'
        `;
        await repo.pool.query(cleanupQuery);
        console.log('Test data cleaned up successfully!');
        */
    } catch (error) {
        console.error("Error during testing:", (error as Error).message);
    } finally {
        await repo.close();
    }
};
