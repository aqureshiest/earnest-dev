import { CodeAnalyzer } from "@/modules/ai/assistants/CodeAnalyzer";
import { PrepareCodebase } from "@/modules/ai/PrepareCodebase";
import { LLM_MODELS } from "@/modules/utils/llmInfo";
import { loadEnvConfig } from "@next/env";

loadEnvConfig("");

async function main() {
    // const files = ["src/integration-tests/test-utils/test-data/upload-files/doc.txt", "abc.xml"];
    // console.log(RepositoryService.shouldExclude(files[0]));

    const codeAnalyzer = new CodeAnalyzer();
    const prepareCodebase = new PrepareCodebase();

    const request: CodingTaskRequest = {
        taskId: "aqureshiest",
        owner: "sds",
        repo: "main",
        branch: "analyze sds code in full",
        task: "analyze sds code in full",
        model: LLM_MODELS.ANTHROPIC_CLAUDE_3_HAIKU,
        files: [],
    };

    const files = await prepareCodebase.prepare(request);
    console.log("files length", files.length);

    await codeAnalyzer.processInChunks(request);

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
}
main();
