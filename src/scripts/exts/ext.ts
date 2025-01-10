import { PromptGenerator } from "@/modules/ai/extensions/PromptGenerator";

export const ext = async () => {
    const prompt = new PromptGenerator();

    const repsonse = await prompt.generateExtensionPrompt("generate API endpoints documentation");
    console.log(JSON.stringify(repsonse, null, 2));
};
