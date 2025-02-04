import { GeneratePRD } from "@/modules/prd/GeneratePRD";
import { LLM_MODELS } from "@/modules/utils/llmInfo";
import { PRDInput } from "@/types/prd";
import { loadEnvConfig } from "@next/env";
import { promises as fs } from "fs";
import path from "path";

// Load environment variables
loadEnvConfig("");

export const prd = async () => {
    const imagePath = "/Users/adeelqureshi/Documents/figma.png";
    const description =
        "The new servicing dashboard where users can perform various tasks including making payments, checking balance, managing accounts, consolidating previous loans, and viewing transaction history.";

    // Resolve the full path
    const fullPath = path.resolve(imagePath);
    console.log(`Reading image from: ${fullPath}`);

    // Read the image file
    const imageBuffer = await fs.readFile(fullPath);

    // Process the image
    const screen = {
        id: "screen-1",
        imageBuffer,
        description,
        name: "Servicing Dashboard",
    };

    const prodInput: PRDInput = {
        goalStatement:
            "Create a new servicing dashboard for users to perform various tasks including offering the ability to consolidate previous loans using the Earnest new product called Personal Loans.",
        targetAudience: ["Existing Earnest Refi customers"],
        keyFeatures: [
            {
                id: "feature-1",
                name: "Consolidate Previous Loans",
                description:
                    "Ability to consolidate previous loans and creating consolidated personal loan from prefilled application data",
                priority: "high",
                figmaScreens: [screen],
            },
        ],
        constraints: ["Using prefill requires us to access the existing data."],
    };

    // Generate PRD
    const prdGenerater = new GeneratePRD(LLM_MODELS.OPENAI_GPT_4O.id);
    const prd = await prdGenerater.generatePRD(prodInput);
    console.log(prd);
};
