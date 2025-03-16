import { displayTime } from "../utils/displayTime";
import { sendTaskUpdate } from "../utils/sendTaskUpdate";
import { LLM_MODELS } from "../utils/llmInfo";
import { CodebaseQuestionAssistant } from "./assistants/codebase-qa/CodebaseQuestionAssistant";
import { PrepareCodebase } from "./PrepareCodebase";
import { CodebaseQuestionClassifierAssistant } from "./assistants/codebase-qa/CodebaseQuestionClassifierAssistant";

export class CodebaseQA {
    private questionAssistant: CodebaseQuestionAssistant;
    private questionClassifier: CodebaseQuestionClassifierAssistant;

    constructor() {
        this.questionAssistant = new CodebaseQuestionAssistant();
        this.questionClassifier = new CodebaseQuestionClassifierAssistant();
    }

    async runWorkflow(taskRequest: CodebaseQuestionRequest): Promise<AIAssistantResponse<string>> {
        const { taskId, task } = taskRequest;

        // Track start time
        const startTime = new Date().getTime();

        try {
            // Step 1: Classify the question to determine the task
            sendTaskUpdate(taskId, "progress", "Understanding question...");
            const classificationResponse = await this.questionClassifier.process(taskRequest);
            const classification = classificationResponse!.response;

            if (classification?.isGeneral) {
                sendTaskUpdate(
                    taskId,
                    "progress",
                    "Its a general question about the codebase. Need broader context."
                );
            } else {
                sendTaskUpdate(
                    taskId,
                    "progress",
                    "Its a specific question. Finding the most relevant files."
                );
            }

            // Step 2: prepare codebase
            sendTaskUpdate(taskId, "progress", "Processing codebase...");
            const codebase = new PrepareCodebase();
            const filesToUse = await codebase.prepare({
                ...taskRequest,
                task: classification?.isGeneral ? "" : task, // if not general, we want all files
            });
            taskRequest.files = filesToUse;

            // Step 3: Process with the assistant (it will handle token limits)
            sendTaskUpdate(taskId, "progress", "Understanding codebase and preparing answer...");
            const answer = await this.questionAssistant.process(taskRequest);

            if (!answer) {
                throw new Error("Failed to generate answer.");
            }

            // Calculate and report metrics
            await this.emitMetrics(taskId, answer);

            // Report time taken
            const endTime = new Date().getTime();
            sendTaskUpdate(taskId, "progress", `Time taken: ${displayTime(startTime, endTime)}`);

            // Track metrics
            const totalDuration = endTime - startTime;
            // await trackDuration(owner, repo, totalDuration);
            // await trackSuccess(owner, repo, true);

            return answer;
        } catch (error: any) {
            console.error("Error in CodebaseQA workflow:", error);
            // TODO
            // await trackSuccess(owner, repo, false);
            throw error;
        }
    }

    private async emitMetrics(taskId: string, result: AIAssistantResponse<any>) {
        sendTaskUpdate(
            taskId,
            "progress",
            `*Approximated tokens: ${result.calculatedTokens.toFixed(0)}`
        );
        sendTaskUpdate(taskId, "progress", `*Actual Input tokens: ${result.inputTokens}`);
        sendTaskUpdate(taskId, "progress", `*Actual Output tokens: ${result.outputTokens}`);
        sendTaskUpdate(taskId, "progress", `*Cost: $${result.cost.toFixed(6)}`);
    }
}
