import { FileFilter } from "@/modules/ai/support/FileFilter";
import { GitHubService } from "@/modules/github/GitHubService";
import { loadEnvConfig } from "@next/env";

loadEnvConfig("");

export const run = async () => {
    const owner = process.env.NEXT_PUBLIC_GITHUB_OWNER!;

    const service = new GitHubService();

    const table: any[] = [];

    runWithTime("getRepoFiles", async () => {
        const files = await service.listRepoFiles(owner, "ss-snapshot", "main");

        for (const file of files) {
            const exclude = FileFilter.shouldExclude(file.path || "");
            table.push({ path: file.path, include: !exclude ? "✅" : "❌" });
        }

        console.table(table);
    });
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const runWithTime = async (label: string, fn: () => Promise<any>) => {
    console.time(label);
    const result = await fn();
    console.timeEnd(label);
    return result;
};
