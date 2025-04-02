import { createHash } from "crypto";
import path from "path";
import chalk from "chalk";
import { reportError } from "@/modules/bugsnag/report";
import { createDirectorySafe, readFileSafe, writeFileSafe } from "@/modules/utils/file";

export interface AIResponse {
    response: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
}

export abstract class BaseAIService {
    protected model: string;
    private cacheDir: string = ".ai_cache";
    private readonly debug: boolean;
    private readonly useCache: boolean = true;

    constructor(model: string) {
        this.model = model;
        this.debug = process.env.AI_SERVICE_DEBUG === "true";
        this.useCache = process.env.AI_SERVICE_USE_CACHE === "true";
    }

    abstract generateResponse(
        systemPrompt: string,
        prompt: string,
        onToken?: (token: string) => void
    ): Promise<AIResponse>;

    abstract generateImageResponse(
        systemPrompt: string,
        prompt: string,
        image: Buffer,
        media_type: "image/png" | "application/pdf"
    ): Promise<AIResponse>;

    protected async cacheResponse(key: string, response: AIResponse): Promise<void> {
        if (!this.useCache) return;

        const cacheDir = path.join(process.cwd(), this.cacheDir);
        await createDirectorySafe(cacheDir);

        const cacheFile = path.join(cacheDir, `${key}.json`);
        await writeFileSafe(cacheFile, JSON.stringify(response));
    }

    protected async getCachedResponse(key: string): Promise<AIResponse | null> {
        if (!this.useCache) return null;

        const cacheFile = path.join(process.cwd(), this.cacheDir, `${key}.json`);
        try {
            const data = (await readFileSafe(cacheFile)) as string;
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

    protected logServiceHeader(serviceName: string): void {
        if (!this.debug) return;
        console.log(chalk.blue(`----------------- ${serviceName} -----------------`));
    }

    protected logPrompts(systemPrompt: string, prompt: string): void {
        if (!this.debug) return;
        console.log("> ", systemPrompt);
        // Condense section with existing_codebase tags
        console.log(
            "> ",
            prompt.replace(
                /<existing_codebase>[\s\S]*<\/existing_codebase>/g,
                "<existing_codebase>.....</existing_codebase>"
            )
        );
    }

    protected logResponse(response: string | undefined, source: string = ""): void {
        if (!this.debug) return;
        console.log(`--- ${source} Response ---`);
        console.log("response", response);
        console.log("-".repeat(source.length + 15));
    }

    protected logCacheHit(serviceName: string): void {
        if (!this.debug) return;
        console.log(chalk.green(serviceName, "Using cached response for model", this.model));
    }

    protected logError(message: string, error: unknown): void {
        console.error(message, error);

        // bugsnag reporting
        reportError(error instanceof Error ? error : new Error(String(error)), {
            aiService: {
                model: this.model,
                message,
            },
        });
    }
}
