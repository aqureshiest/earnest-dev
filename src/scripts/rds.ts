import { Pool } from "pg";
import { loadEnvConfig } from "@next/env";

// Load environment variables
loadEnvConfig("");

export const rds = async () => {
    const pool = new Pool({
        user: process.env.POSTGRES_USER || "postgres",
        host: process.env.POSTGRES_HOST || "localhost",
        database: process.env.POSTGRES_DATABASE || "",
        password: process.env.POSTGRES_PASSWORD || "imWErJY0amCCGjGhNvEL",
        port: parseInt(process.env.POSTGRES_PORT || "5432"),
        ssl:
            process.env.POSTGRES_SSL === "true"
                ? {
                      rejectUnauthorized: false,
                  }
                : undefined,
    });

    try {
        // Test basic connection
        console.log("Attempting to connect to PostgreSQL...");
        const client = await pool.connect();
        console.log("Successfully connected to PostgreSQL!");

        // Check PostgreSQL version
        const versionResult = await client.query("SELECT version();");
        console.log("\nPostgreSQL Version:", versionResult.rows[0].version);

        // Check if pgvector extension is installed
        console.log("\nChecking pgvector extension...");
        const extensionResult = await client.query(`
            SELECT installed_version 
            FROM pg_available_extensions 
            WHERE name = 'vector';
        `);

        if (extensionResult.rows.length > 0) {
            console.log("pgvector extension is available!");
            console.log("Installed version:", extensionResult.rows[0].installed_version);
        } else {
            console.log("WARNING: pgvector extension is not installed!");
        }

        // Test vector operations if pgvector is installed
        try {
            console.log("\nTesting vector operations...");
            await client.query(`
                CREATE TEMPORARY TABLE vector_test (
                    id serial primary key,
                    embedding vector(3)
                );
                
                INSERT INTO vector_test (embedding) 
                VALUES ('[1,2,3]'::vector);
            `);
            console.log("Successfully created and inserted a test vector!");
        } catch (error: any) {
            console.error("Error testing vector operations:", error.message);
        }

        // Check existing tables
        console.log("\nChecking for required tables...");
        const tablesResult = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public';
        `);

        const tables = tablesResult.rows.map((row) => row.table_name);
        console.log("Existing tables:", tables);

        const requiredTables = ["branchcommits", "filedetails"];
        for (const table of requiredTables) {
            if (tables.includes(table)) {
                console.log(`✓ Table '${table}' exists`);
            } else {
                console.log(`✗ Table '${table}' is missing`);
            }
        }

        client.release();
    } catch (error) {
        console.error("Error:", (error as Error).message);
    } finally {
        await pool.end();
    }
};
