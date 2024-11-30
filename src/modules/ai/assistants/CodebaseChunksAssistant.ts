import { saveRunInfo } from "@/modules/utils/saveRunInfo";
import { BaseAssistant } from "./BaseAssistant";
import { sendTaskUpdate } from "@/modules/utils/sendTaskUpdate";

abstract class CodebaseChunksAssistant<R> extends BaseAssistant<CodingTaskRequest, R> {
    async process(request: CodingTaskRequest): Promise<AIAssistantResponse<R> | null> {
        const { model, task, files, params } = request;

        console.log(
            `[${this.constructor.name}] Processing task:\n>>${task}\n>>with model: ${model}`
        );

        const systemPrompt = this.getSystemPrompt();
        const basePrompt = this.getPrompt();

        const userParams = {
            ...params,
            taskDescription: task,
        };

        // Build the user prompt first
        const userPrompt = this.promptBuilder.buildUserPrompt(basePrompt, userParams);

        // Split files into chunks
        const chunks = this.tokenLimiter.splitInChunks(model, systemPrompt + userPrompt, files);

        const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

        const responses: AIAssistantResponse<R>[] = [];
        // Process chunks sequentially with a delay between them
        for (let index = 0; index < chunks.length; index++) {
            const chunk = chunks[index];
            const logMessage = `* Processing chunk ${index + 1}/${chunks.length} of ${
                chunk.files.length
            } files with ${chunk.tokens.toFixed(0)} tokens`;
            this.logMessage(request, logMessage);

            // Add the chunk files to the prompt
            const finalPromptWithFiles = this.promptBuilder.addChunkFilesToPrompt(
                userPrompt,
                index + 1,
                chunk.files
            );

            const caller = this.constructor.name;
            saveRunInfo(request, caller, `system_prompt_chunk_${index + 1}`, systemPrompt);
            saveRunInfo(request, caller, `user_prompt_chunk_${index + 1}`, finalPromptWithFiles);

            try {
                // Generate response for the chunk
                const aiResponse = await this.generateResponse(
                    model,
                    systemPrompt,
                    finalPromptWithFiles
                );
                if (!aiResponse) {
                    console.warn(`No response for chunk ${index + 1}`);
                    continue;
                }

                saveRunInfo(request, caller, `ai_response_chunk_${index + 1}`, aiResponse.response);
                // Parse the response
                const parsed = this.handleResponse(aiResponse.response);
                saveRunInfo(
                    request,
                    caller,
                    `ai_response_parsed_chunk_${index + 1}`,
                    parsed,
                    this.responseType
                );

                // Save result data
                responses.push({
                    ...aiResponse,
                    response: parsed,
                    responseStr: aiResponse.response,
                    calculatedTokens: chunk.tokens,
                });

                console.log(`Chunk ${index + 1} processed successfully.`);
            } catch (error) {
                console.error(`Error processing chunk ${index + 1}:`, error);
                throw error;
            }

            // Introduce a delay between chunk processing
            // if (index < chunks.length - 1) {
            //     const delayDuration = 15000;
            //     console.log(`Delaying for ${delayDuration}ms before processing next chunk`);
            //     await delay(delayDuration);
            // }
        }

        // Aggregate all responses
        const finalResponse: AIAssistantResponse<R> = {
            response: this.aggregateResponses(responses.map((r) => r.response)),
            responseStr: responses.map((r) => r.responseStr).join("\n"),
            calculatedTokens: responses.reduce((acc, val) => acc + val.calculatedTokens, 0),
            inputTokens: responses.reduce((acc, val) => acc + val.inputTokens, 0),
            outputTokens: responses.reduce((acc, val) => acc + val.outputTokens, 0),
            cost: responses.reduce((acc, val) => acc + val.cost, 0),
        };

        return finalResponse;
    }

    protected abstract aggregateResponses(responses: (R | null)[]): R;

    private logMessage(request: CodingTaskRequest, message: string) {
        const taskId = request.taskId.includes("-") ? request.taskId.split("-")[0] : request.taskId;
        console.log(message);
        sendTaskUpdate(taskId, "progress", message);
    }
}

export { CodebaseChunksAssistant };
