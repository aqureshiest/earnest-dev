import { CODEFILES_PLACEHOLDER } from "@/constants";
import { formatFiles } from "@/modules/utils/formatFiles";

export class PromptBuilder {
    buildUserPrompt(basePrompt: string, params: Record<string, string>): string {
        // interpolate all params in the base prompt except existing code files
        const keys = Object.keys(params || []).filter(
            (key) => key.toUpperCase() !== CODEFILES_PLACEHOLDER
        );

        const userPrompt = keys.reduce((acc, key) => {
            return acc.replaceAll(`[[${key.toUpperCase()}]]`, params[key]);
        }, basePrompt);

        return userPrompt;
    }

    addFilesToPrompt(prompt: string, files: FileDetails[]): string {
        const formattedFiles = formatFiles(files);
        return prompt.replace(CODEFILES_PLACEHOLDER, formattedFiles);
    }

    addChunkFilesToPrompt(prompt: string, chunkNumber: number, files: FileDetails[]): string {
        const updatedPrompt = prompt.replace("[[CHUNKNUMBER]]", chunkNumber.toString());
        return this.addFilesToPrompt(updatedPrompt, files);
    }
}
