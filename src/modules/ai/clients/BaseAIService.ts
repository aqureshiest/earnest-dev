import { createHash } from "crypto";
import fs from "fs/promises";
import path from "path";

abstract class BaseAIService {
    protected model: string;

    private cacheDir: string = ".ai_cache";

    constructor(model: string) {
        this.model = model;
    }

    abstract generateResponse(systemPrompt: string, prompt: string): Promise<AIResponse>;

    protected async cacheResponse(key: string, response: AIResponse): Promise<void> {
        const cacheDir = path.join(process.cwd(), this.cacheDir);
        await fs.mkdir(cacheDir, { recursive: true });
        const cacheFile = path.join(cacheDir, `${key}.json`);
        await fs.writeFile(cacheFile, JSON.stringify(response));
    }

    protected async getCachedResponse(key: string): Promise<AIResponse | null> {
        const cacheFile = path.join(process.cwd(), this.cacheDir, `${key}.json`);
        try {
            const data = await fs.readFile(cacheFile, "utf-8");
            return JSON.parse(data) as AIResponse;
        } catch (error) {
            return null;
        }
    }

    protected getCacheKey(model: string, systemPrompt: string, prompt: string): string {
        const combined = `${model}${systemPrompt}${prompt}`;
        const key = createHash("md5").update(combined).digest("hex");
        return key;
    }
}

export { BaseAIService };
