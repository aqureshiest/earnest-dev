import { GitHubService } from "@/modules/github/GitHubService";
import { loadEnvConfig } from "@next/env";
import { encode } from "gpt-tokenizer";

loadEnvConfig("");
async function main() {
    // const ghService = new GitHubService();
    // const owner = "aqureshiest";
    // const repo = "lc";
    // const branch = "main";
    // const file = "src/clients/ecore-service/client.test.ts";
    // const fileData = await ghService.readFile(owner, repo, branch, file);
    // const fileContents = Buffer.from(fileData.content, "base64").toString("utf-8");
    // console.log(fileContents);
    // console.log("-----------------------------------");
    // // count tokens
    // const tokenCount = encode(fileContents).length;
    // console.log("Token count:", tokenCount);
}

main();
