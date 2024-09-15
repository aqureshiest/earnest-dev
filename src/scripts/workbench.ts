import { RepoAnalyzerAssistant } from "@/modules/ai/assistants/repo-analyzer/ChunksAnalyzerAssistant";
import { DescribeImageAssistant } from "@/modules/ai/assistants/DescribeImageAssistant";
import { PrepareCodebase } from "@/modules/ai/PrepareCodebase";
import { LLM_MODELS } from "@/modules/utils/llmInfo";
import { loadEnvConfig } from "@next/env";

loadEnvConfig("");

async function main() {
    const describeImageAssistant = new DescribeImageAssistant();

    const request = {
        taskId: "1aqureshiest",
        task: "describe image",
        model: LLM_MODELS.ANTHROPIC_CLAUDE_3_HAIKU,
    };

    await describeImageAssistant.process(request);
}
main();
