import { CodingAssistant } from "@/modules/ai/assistants/CodingAssistant";
import { PlannerAssistant } from "@/modules/ai/assistants/PlannerAssistant";
import { SpecificationsAssistant } from "@/modules/ai/assistants/SpecificationsAssistant";
import { GitHubService } from "@/modules/github/GitHubService";
import { parseXml } from "@/modules/utilities/parseXml";
import { parseYaml } from "@/modules/utilities/parseYaml";
import { loadEnvConfig } from "@next/env";
import { XMLBuilder, XMLParser } from "fast-xml-parser";
import { encode } from "gpt-tokenizer";
import { Ewert } from "next/font/google";

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

    const file = fs.readFileSync(
        path.join(
            __dirname,
            "../../runs/add_published_date_to_books/specificationsassistant/ai_response_1724363360861.txt"
        ),
        "utf8"
    );

    //     const yamlString = `
    // \`\`\`yaml
    // prTitle: "Add error handling to S3 upload functionality"

    // newFiles:
    //   - path: "file 0"
    //     thoughts: "Do something"
    //     content: |
    //       File 0 Contents
    // newFiles:
    //   - path: "file 1"
    //     thoughts: "Do something"
    //     content: |
    //       File 1 Contents
    // modifiedFiles:
    //   - path: "file 2"
    //     thoughts: "Do something"
    //     content: |
    //       File 2 Contents
    // modifiedFiles:
    //   - path: "file 2"
    //     thoughts: "Do something"
    //     content: |
    //       File 2 Contents
    // modifiedFiles:
    //   - path: "file3.md"
    //     thoughts: "Do something"
    //     content: |
    //       # Do something

    //       ## then do more

    //       Finally complete it

    // deletedFiles: []
    // \`\`\`
    // `;

    //     const parsed = parseYaml(yamlString);

    //     console.log(parsed);

    const xml = `
<code_changes>
    <title>Title of the PR</title>
    <new_files>
        <file>
            <path>path/to/new/file1</path>
            <thoughts>Thoughts on the creation of this new file</thoughts>
            <content>
                // Full content of the new file goes here
            </content>
        </file>
        <file>
            <path>path/to/new/file2</path>
            <thoughts>Thoughts on the creation of this new file</thoughts>
            <content>
                // Full content of another new file goes here
            </content>
        </file>
    </new_files>
    <modified_files>
        <file>
            <path>path/to/modified/file1</path>
            <thoughts>Thoughts on the modifications made to this file</thoughts>
            <content>
                // Full content of the modified file goes here, including all changes
            </content>
        </file>        
    </modified_files>
    <deleted_files>
        <file>
            <path>path/to/deleted/file1</path>
        </file>
        <file>
            <path>path/to/deleted/file2</path>
        </file>
    </deleted_files>
</code_changes>



    `;

    const coder = new CodingAssistant();
    const parsedData = coder.handleResponse("model", "task", xml);

    console.log(parsedData);

    // Flattening nested structures to match the TypeScript types
    // const specifications = parsedData.specifications.specification.map((spec: any) => ({
    //     title: spec.title,
    //     summary: spec.summary,
    //     key_steps: Array.isArray(spec.key_steps?.step)
    //         ? spec.key_steps.step
    //         : [spec.key_steps.step],
    //     considerations: Array.isArray(spec.considerations?.consideration)
    //         ? spec.considerations.consideration
    //         : [spec.considerations.consideration],
    // }));
}

main();
