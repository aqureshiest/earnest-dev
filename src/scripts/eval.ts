import { GitHubService } from "@/modules/github/GitHubService";
import { parseYaml } from "@/modules/utilities/parseYaml";
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

    // read yaml from /Users/adeelqureshi/earnest/earnest-dev/runs/add_error_handling_to_S__upload_functionality/codingassistant/ai_response_1723825863072.txt
    const fs = require("fs");
    const yaml = require("js-yaml");
    const path = require("path");

    const yamlFile = fs.readFileSync(
        path.join(
            __dirname,
            "../../runs/add_error_handling_to_S__upload_functionality/codingassistant/ai_response_1723825863072.txt"
        ),
        "utf8"
    );

    const yamlString = `
\`\`\`yaml
prTitle: "Add error handling to S3 upload functionality"

newFiles:
  - path: "file 0"
    thoughts: "Do something"
    content: |
      File 0 Contents
newFiles:
  - path: "file 1"
    thoughts: "Do something"
    content: |
      File 1 Contents
modifiedFiles:
  - path: "file 2"
    thoughts: "Do something"
    content: |
      File 2 Contents
modifiedFiles:
  - path: "file 2"
    thoughts: "Do something"
    content: |
      File 2 Contents
modifiedFiles:
  - path: "file3.md"
    thoughts: "Do something"
    content: |
      # Do something

      ## then do more

      Finally complete it

deletedFiles: []
\`\`\`    
`;

    const parsed = parseYaml(yamlString);

    console.log(parsed);
}

main();
