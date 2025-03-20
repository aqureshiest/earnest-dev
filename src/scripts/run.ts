import { RepositoryService } from "@/modules/github/RepositoryService";
import { loadEnvConfig } from "@next/env";

loadEnvConfig("");

export const run = async () => {
    const owner = process.env.NEXT_PUBLIC_GITHUB_OWNER!;

    const repo = new RepositoryService();

    runWithTime("getRepoFiles", async () => {
        await repo.getRepositoryFiles(owner, "as-snapshot");
    });
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const runWithTime = async (label: string, fn: () => Promise<any>) => {
    console.time(label);
    const result = await fn();
    console.timeEnd(label);
    return result;
};
