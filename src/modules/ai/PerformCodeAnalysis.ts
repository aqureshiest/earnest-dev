import { displayTime } from "../utils/displayTime";
import { sendTaskUpdate } from "../utils/sendTaskUpdate";
import { CodeAnaylsisAssistant } from "./assistants/code-analysis/CodeAnalyisAssistant";
import fs from "fs/promises";
import { PrepareCodebase } from "./PrepareCodebase";

export class PerformCodeAnalysis {
    private codeAnalysisAssistant: CodeAnaylsisAssistant;
    private readonly PATH_TO_PATTERNS =
        "src/modules/ai/assistants/under-development/code-analysis/patterns";

    constructor() {
        this.codeAnalysisAssistant = new CodeAnaylsisAssistant();
    }

    async runAnalysis(request: CodeAnalysisRequest) {
        const { taskId, analysisTypes } = request;
        const startTime = new Date().getTime();
        let totalCost = 0;

        try {
            // Initial progress update
            sendTaskUpdate(taskId, "progress", "Initializing code analysis process...");

            // Prepare codebase
            sendTaskUpdate(taskId, "progress", "Preparing codebase for analysis...");
            const prepareCodebase = new PrepareCodebase();
            const files = await prepareCodebase.prepare(request);

            // Process each analysis type
            for (const analysisType of analysisTypes) {
                try {
                    // Load patterns
                    sendTaskUpdate(
                        taskId,
                        "progress",
                        `Loading analysis patterns for ${analysisType}...`
                    );

                    const patternsFile = `${this.PATH_TO_PATTERNS}/${analysisType}.md`;
                    const patterns = await fs.readFile(patternsFile, "utf-8");

                    // Prepare analysis request
                    const codeAnalysisRequest: CodingTaskRequest = {
                        ...request,
                        taskId: `${taskId}-${analysisType}`,
                        files,
                        params: {
                            criticalPatterns: patterns,
                        },
                    };

                    // Run analysis
                    sendTaskUpdate(taskId, "progress", `Running ${analysisType} analysis...`);

                    const analysis = await this.codeAnalysisAssistant.process(codeAnalysisRequest);

                    if (!analysis || !analysis.response) {
                        throw new Error(`Failed to generate ${analysisType} analysis`);
                    }

                    // Track costs
                    totalCost += analysis.cost;

                    // Send completion updates
                    sendTaskUpdate(taskId, "progress", `${analysisType} analysis completed.`);
                    sendTaskUpdate(taskId, "complete", {
                        analysisType,
                        response: analysis.response,
                    });

                    this.emitMetrics(taskId, analysis);
                } catch (error: any) {
                    sendTaskUpdate(
                        taskId,
                        "error",
                        `Error in ${analysisType} analysis: ${error.message}`
                    );
                }
            }

            sendTaskUpdate(taskId, "progress", `Total Cost: $${totalCost.toFixed(6)}`);

            const endTime = new Date().getTime();
            sendTaskUpdate(taskId, "progress", `Time taken: ${displayTime(startTime, endTime)}`);
        } catch (error: any) {
            sendTaskUpdate(taskId, "error", `Analysis failed: ${error.message}`);
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
