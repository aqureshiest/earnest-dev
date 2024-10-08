import fs from "fs";

export const misc = async () => {
    const file =
        "/Users/adeelqureshi/earnest/earnest-dev/runs/1728338399533-4/jiraticketsassistant/ai_response.txt";
    const content = fs.readFileSync(file, "utf-8");

    const match = content.match(/<jira_items>[\s\S]*<\/jira_items>/);
    const matchedBlock = match ? match[0] : "";

    console.log(matchedBlock);
};
