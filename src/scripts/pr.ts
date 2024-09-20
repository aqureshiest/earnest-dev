import PullRequestService from "@/modules/github/PullRequestService";
import { parseYaml } from "@/modules/utils/parseYaml";
import { loadEnvConfig } from "@next/env";
import { encode } from "gpt-tokenizer";

loadEnvConfig("");
export const pr = async () => {
    const fs = require("fs");
    const yaml = require("js-yaml");
    const path = require("path");

    const yamlFile = fs.readFileSync(
        path.join(
            __dirname,
            "../../runs/add_error_handling_to_S__uploads/codingassistant/ai_response_1724164460585.txt"
        ),
        "utf8"
    );

    const codeChanges = parseYaml(yamlFile) as CodeChanges;
    const owner = "aqureshiest";
    const repo = "sds";
    const branch = "main";

    const prService = new PullRequestService(owner, repo, branch);
    const prLink = await prService.createPullRequest(codeChanges, codeChanges.title, "Test PR");

    console.log(prLink);
};
