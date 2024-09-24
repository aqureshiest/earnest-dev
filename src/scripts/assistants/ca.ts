import { AggregatorAssistant } from "@/modules/ai/assistants/archive/repo-analyzer/AggregatorAssistant";
import { ChunksAnalyzerAssistant } from "@/modules/ai/assistants/archive/repo-analyzer/ChunksAnalyzerAssistant";
import { PrepareCodebase } from "@/modules/ai/PrepareCodebase";
import { LLM_MODELS } from "@/modules/utils/llmInfo";
import { loadEnvConfig } from "@next/env";

loadEnvConfig("");

export const CA = async () => {
    // const files = ["src/integration-tests/test-utils/test-data/upload-files/doc.txt", "abc.xml"];
    // console.log(RepositoryService.shouldExclude(files[0]));

    const repo = "laps-snapshot";

    const codeAnalyzer = new ChunksAnalyzerAssistant();

    const analyze: CodingTaskRequest = {
        taskId: Date.now().toString(),
        owner: "aqureshiest",
        repo: repo,
        branch: "main",
        task: "",
        model: LLM_MODELS.ANTHROPIC_CLAUDE_3_5_SONNET,
        files: [],
    };
    console.log("analyze task id", analyze.taskId);

    const prepareCodebase = new PrepareCodebase();
    const files = await prepareCodebase.prepare(analyze);
    console.log("files length", files.length);
    analyze.files = files;

    const analyses = await codeAnalyzer.process(analyze);

    // --

    const aggregator = new AggregatorAssistant();
    const aggregate: TaskRequest = {
        taskId: Date.now().toString(),
        task: "",
        model: LLM_MODELS.ANTHROPIC_CLAUDE_3_5_SONNET,
        params: {
            chunkAnalyses: analyses?.responseStr,
        },
    };
    console.log("aggregate task id", aggregate.taskId);

    const aggregated = await aggregator.process(aggregate);
    // console.log("aggregated", aggregated);

    // const request = {
    //     model: LLM_MODELS.ANTHROPIC_CLAUDE_3_HAIKU,
    //     task: "analyze code in full",
    //     files,
    //     params: {
    //         chunkNumber: 1,
    //     },
    // };
    // await codeAnalyzer.process(request);
    // // count total tokens from file.tokenCount
    // let totalTokens = 0;
    // for (const file of files) {
    //     totalTokens += file.tokenCount!;
    // }
    // console.log("total tokens", totalTokens);
    // const tokenLimiter = new TokenLimiter();
    // const chunks = tokenLimiter.splitInChunks(files, 10000);
    // console.log("chunks length", chunks.length);
    // // analyze chunks using the code analyzer
    // for (let i = 0; i < chunks.length; i++) {
    //     console.log("chunk", i + 1);
    //     const request = {
    //         model: LLM_MODELS.ANTHROPIC_CLAUDE_3_HAIKU,
    //         task: "analyze code chunk " + (i + 1),
    //         files: chunks[i],
    //         params: {
    //             chunkNumber: i + 1,
    //         },
    //     };
    //     await codeAnalyzer.process(request);
    // }
    // const tokenLimiter = new TokenLimiter();
    // const chunks = tokenLimiter.splitInChunks(files, 1000);
    // console.log("chunks length", chunks.length);
    // for (let i = 0; i < chunks.length; i++) {
    //     console.log("chunk", i + 1);
    //     // const request: AIAssistantRequest = {
    //     //     model: LLM_MODELS.ANTHROPIC_CLAUDE_3_HAIKU,
    //     //     task: "analyze code chunk " + (i + 1),
    //     //     files: chunks,
    //     //     params: {
    //     //         chunkNumber: i + 1,
    //     //     },
    //     // };
    //     // const codeAnalyzer = new CodeAnalyzer();
    //     // await codeAnalyzer.process(request);
    // }
};
