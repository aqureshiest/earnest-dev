import { PrepareCodebase } from "@/modules/ai/PrepareCodebase";
import { TokenLimiter } from "@/modules/ai/support/TokenLimiter";
import { LLM_MODELS } from "@/modules/utils/llmInfo";

export const trimPrompt = async () => {
    const repo = "sds";

    const request: CodingTaskRequest = {
        taskId: Date.now().toString(),
        owner: "aqureshiest",
        repo: repo,
        branch: "main",
        task: "",
        model: LLM_MODELS.ANTHROPIC_CLAUDE_3_5_SONNET,
        files: [],
        params: {},
    };
    console.log("request task id", request.taskId);

    const prepareCodebase = new PrepareCodebase();
    const files = await prepareCodebase.prepare(request);
    console.log("files length", files.length);
    request.files = files;

    // remove test.ts files
    request.files = request.files.filter((file) => !file.name.includes("test.ts"));
    console.log("files length after removing test.ts", request.files.length);

    // --

    const limiter = new TokenLimiter();
    const result: any = limiter.applyTokenLimit(request.model, "Noop", request.files);
    console.log(`can fit ${result.allowedFiles.length} files in ${result.totalTokens} tokens`);
};
