import { saveRunInfo } from "@/modules/utils/saveRunInfo";
import { BaseAssistant } from "./BaseAssistant";

abstract class CodebaseChunksAssistant<R> extends BaseAssistant<CodingTaskRequest, R> {
    async processInChunks(request: CodingTaskRequest): Promise<AIAssistantResponse<R>[] | null> {
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

        // Helper to introduce a delay between requests
        const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

        const responses = [];
        // Process chunks sequentially with a delay between them
        for (let index = 0; index < chunks.length; index++) {
            const chunk = chunks[index];
            console.log(
                `Processing chunk ${index + 1} of ${chunk.files.length} files with tokens ${
                    chunk.tokens
                }`
            );

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

                // Parse the response
                const parsed = this.handleResponse(aiResponse.response);

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
                // Continue processing other chunks even if one fails
            }

            // Introduce a delay between chunk processing to avoid overloading API
            const delayDuration = 30000;
            console.log(`Delaying for ${delayDuration}ms before processing next chunk`);
            await delay(delayDuration);
        }

        return responses;
    }
}

export { CodebaseChunksAssistant };
