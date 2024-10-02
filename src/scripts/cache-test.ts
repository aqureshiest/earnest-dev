import fs from "fs";
import { loadEnvConfig } from "@next/env";
import { PrepareCodebase } from "@/modules/ai/PrepareCodebase";
import { LLM_MODELS, LLMS } from "@/modules/utils/llmInfo";
import { TokenLimiter } from "@/modules/ai/support/TokenLimiter";
import { TestDataGenerator } from "./TestDataGenerator";
import { createHash } from "crypto";
import { PromptBuilder } from "@/modules/ai/support/PromptBuilder";
import { CONFIG_FILES } from "next/dist/shared/lib/constants";
import { CODEFILES_PLACEHOLDER } from "@/constants";
import { CodebaseAssistant } from "@/modules/ai/assistants/CodebaseAssistant";
import { CodingAssistant } from "@/modules/ai/assistants/generate-code/CodingAssistant";
import { TDDAnalystAssistant } from "@/modules/ai/assistants/under-development/jira/FeatureBreakdownAssistant";
import { JiraTicketsAssistant } from "@/modules/ai/assistants/under-development/jira/JiraTicketsAssistant";

loadEnvConfig("");

const getCacheKey = (model: string, systemPrompt: string, prompt: string): string => {
    const combined = `${model}${systemPrompt}${prompt}`;
    return createHash("md5").update(combined).digest("hex");
};

const taskXml = `
<name>add published date to books</name>
<description>Add a published date field to the books table</description>
<complexity>Medium</complexity>
`;

export const cacheTest = async () => {
    const codebase = new PrepareCodebase();
    const request: CodingTaskRequest = {
        taskId: Date.now().toString(),
        owner: "aqureshiest",
        repo: "bookstore",
        branch: "main",
        task: taskXml,
        model: LLM_MODELS.ANTHROPIC_CLAUDE_3_HAIKU,
        files: [],
        params: {},
    };

    const files = await codebase.prepare(request);
    console.log(`Files: ${files.length}`);

    const assistant = new JiraTicketsAssistant();
    const result = await assistant.process(request);

    console.log(result);
};
