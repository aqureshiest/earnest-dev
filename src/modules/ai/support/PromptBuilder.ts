import { CODEFILES_PLACEHOLDER } from "@/constants";
import { formatFiles } from "@/modules/utilities/formatFiles";

export class PromptBuilder {
    buildUserPrompt(basePrompt: string, params: Record<string, string>): string {
        // interpolate all params in the base prompt except existing code files
        const keys = Object.keys(params || []).filter(
            (key) => key.toUpperCase() !== CODEFILES_PLACEHOLDER
        );

        const userPrompt = keys.reduce((acc, key) => {
            return acc.replace(`[[${key.toUpperCase()}]]`, params[key]);
        }, basePrompt);

        return userPrompt;
    }

    addFilesToPrompt(prompt: string, files: FileDetails[]): string {
        const formattedFiles = formatFiles(files);
        return prompt.replace(CODEFILES_PLACEHOLDER, formattedFiles);
    }
}
