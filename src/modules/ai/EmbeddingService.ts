import { EMBEDDINGS_DIMENSIONS, EMBEDDINGS_MODEL } from "@/constants";
import OpenAI from "openai";

export class EmbeddingService {
    private openai: OpenAI;

    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY,
            dangerouslyAllowBrowser: true,
        });
    }

    async generateEmbeddingsForFiles(files: FileDetails[]) {
        const filesToUpdate = files.filter(
            (file) => !file.embeddings || file.embeddings.length === 0
        );

        if (filesToUpdate.length === 0) {
            console.log("No files to update embeddings");
            return files;
        }

        const inputTexts = filesToUpdate.map((file) => `${file.path}\n${file.content}`);

        console.log("Generating embeddings for", filesToUpdate.length, "files");
        const response = await this.openai.embeddings.create({
            model: EMBEDDINGS_MODEL,
            dimensions: EMBEDDINGS_DIMENSIONS,
            input: inputTexts,
        });

        const embeddings = response?.data?.map((item) => item.embedding) || [];

        // Create a map of updated files to their embeddings
        const updatedFilesMap = new Map();
        filesToUpdate.forEach((file, index) => {
            const key = `${file.branch.owner}/${file.branch.repo}/${file.branch.ref}/${file.path}`;
            updatedFilesMap.set(key, embeddings[index]);
        });

        // Update files array with new embeddings
        return files.map((file) => {
            const key = `${file.branch.owner}/${file.branch.repo}/${file.branch.ref}/${file.path}`;
            return {
                ...file,
                embeddings:
                    file.embeddings && file.embeddings.length > 0
                        ? file.embeddings
                        : updatedFilesMap.get(key),
            };
        });
    }

    async generateEmbeddings(text: string) {
        const response: any = await this.openai.embeddings.create({
            model: EMBEDDINGS_MODEL,
            dimensions: EMBEDDINGS_DIMENSIONS,
            input: text,
        });

        return response?.data[0].embedding || [];
    }
}
