import { displayTime } from "../utils/displayTime";
import { sendTaskUpdate } from "../utils/sendTaskUpdate";
import { CodebaseQuestionAssistant } from "./assistants/codebase-qa/CodebaseQuestionAssistant";
import { PrepareCodebase } from "./PrepareCodebase";
import { CodebaseQuestionClassifierAssistant } from "./assistants/codebase-qa/CodebaseQuestionClassifierAssistant";
import { CodebaseQAMetricsService } from "../metrics/generate/CodebaseQAMetricsService";

export class CodebaseQA {
    private questionAssistant: CodebaseQuestionAssistant;
    private questionClassifier: CodebaseQuestionClassifierAssistant;
    private metricsService: CodebaseQAMetricsService;

    constructor() {
        this.questionAssistant = new CodebaseQuestionAssistant();
        this.questionClassifier = new CodebaseQuestionClassifierAssistant();
        this.metricsService = new CodebaseQAMetricsService();
    }

    async runWorkflow(
        taskRequest: CodebaseQuestionRequest,
        onToken?: (token: string) => void
    ): Promise<AIAssistantResponse<string>> {
        const { taskId, task, owner, repo } = taskRequest;

        // Track start time
        const startTime = new Date().getTime();

        try {
            // Step 1: Classify the question to determine the task
            sendTaskUpdate(taskId, "progress", "Understanding question...");
            const classificationResponse = await this.questionClassifier.process(taskRequest);
            const classification = classificationResponse!.response;

            const questionType = classification?.isGeneral ? "general" : "specific";

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

            // Track classification token usage
            await this.metricsService.trackQATokenUsage({
                owner,
                repo,
                inputTokens: classificationResponse!.inputTokens,
                outputTokens: classificationResponse!.outputTokens,
                cost: classificationResponse!.cost,
                questionType,
            });

            // Step 2: prepare codebase
            sendTaskUpdate(taskId, "progress", "Processing codebase...");
            const codebase = new PrepareCodebase();
            const filesToUse = await codebase.prepare({
                ...taskRequest,
                task: classification?.isGeneral ? "" : task, // if not general, we want all files
            });
            taskRequest.files = filesToUse;

            // Track files analyzed
            await this.metricsService.trackQuestionRequest({
                owner,
                repo,
                questionType,
                filesAnalyzed: filesToUse.length,
            });

            // Step 3: Process with the assistant (it will handle token limits)
            sendTaskUpdate(taskId, "progress", "Understanding codebase and preparing answer...");

            // Initialize the streaming response
            if (onToken) {
                sendTaskUpdate(taskId, "streaming_start", "");
            }

            const answer = await this.questionAssistant.process(taskRequest, onToken);

            if (!answer) {
                throw new Error("Failed to generate answer.");
            }

            // Calculate and report metrics
            await this.emitMetrics(taskId, answer);

            // Track token usage metrics in CloudWatch
            await this.metricsService.trackQATokenUsage({
                owner,
                repo,
                inputTokens: answer.inputTokens,
                outputTokens: answer.outputTokens,
                cost: answer.cost,
                questionType,
            });

            // Report time taken
            const endTime = new Date().getTime();
            sendTaskUpdate(taskId, "progress", `Time taken: ${displayTime(startTime, endTime)}`);

            // Track metrics
            const totalDuration = endTime - startTime;
            await this.metricsService.trackQADuration({ owner, repo }, totalDuration);

            return answer;
        } catch (error: any) {
            console.error("Error in CodebaseQA workflow:", error);
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
