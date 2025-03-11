import { RepositoryDataService } from "../db/RepositoryDataService";
import { CodeIndexer } from "./support/CodeIndexer";
import { AIServiceFactory } from "./clients/AIServiceFactory";

interface CodeReference {
    path: string;
    snippet: string;
    lineNumbers: string;
}

interface ChatResponse {
    response: string;
    codeReferences: CodeReference[];
    inputTokens: number;
    outputTokens: number;
    cost: number;
}

export class ChatCodebaseService {
    private dataService: RepositoryDataService;
    private indexer: CodeIndexer;
    private MAX_CHUNKS = 20; // Maximum number of code chunks to include
    private SIMILARITY_THRESHOLD = 0.3; // Minimum similarity score to include a chunk

    constructor() {
        this.dataService = new RepositoryDataService();
        this.indexer = new CodeIndexer();
    }

    async processMessage(
        owner: string,
        repo: string,
        branch: string,
        message: string,
        model: string,
        history: any[] = []
    ): Promise<ChatResponse> {
        try {
            // Generate embedding for the user query
            const queryEmbedding = await this.indexer.generateEmbedding(message);

            // Get the raw chunks directly from the database
            // Pass similarity threshold to apply it directly in the query
            const chunks = await this.dataService.findSimilarChunks(
                owner,
                repo,
                branch,
                queryEmbedding,
                this.MAX_CHUNKS,
                this.SIMILARITY_THRESHOLD
            );

            // No need to filter by similarity threshold as it's already applied in the query
            const relevantChunks = chunks.map((chunk) => {
                // Calculate approximate line numbers
                const lineStart = (chunk.content.substring(0, 0).match(/\n/g) || []).length + 1;
                const lineEnd = lineStart + (chunk.content.match(/\n/g) || []).length;

                return {
                    ...chunk,
                    lineStart,
                    lineEnd,
                };
            });

            if (!relevantChunks.length) {
                return {
                    response:
                        "I couldn't find any relevant code in the repository to answer your question. Could you please provide more context or rephrase your question?",
                    codeReferences: [],
                    inputTokens: 0,
                    outputTokens: 0,
                    cost: 0,
                };
            }

            // Format code chunks for context
            const codeContext = this.formatCodeChunksForContext(relevantChunks);

            // Format conversation history
            const formattedHistory = this.formatConversationHistory(history);

            // Create system prompt
            const systemPrompt = this.getSystemPrompt();

            // Create user prompt with context
            const userPrompt = this.buildUserPrompt(message, codeContext, formattedHistory);

            // Get AI response
            const aiService = AIServiceFactory.createAIService(model);
            const aiResponse = await aiService.generateResponse(systemPrompt, userPrompt);

            // Extract code references from the chunks to return
            const codeReferences = this.extractCodeReferences(relevantChunks);

            return {
                response: aiResponse.response,
                codeReferences,
                inputTokens: aiResponse.inputTokens,
                outputTokens: aiResponse.outputTokens,
                cost: aiResponse.cost,
            };
        } catch (error) {
            console.error("Error processing message:", error);
            throw error;
        }
    }

    private getSystemPrompt(): string {
        return `
You're a fellow developer helping out a teammate with their codebase questions. Keep your tone casual, friendly, and conversational - like you're chatting over coffee.

When looking at code:
- Skip the formalities and get straight to the point
- Talk like a real developer would to another developer
- Use everyday language but don't dumb down technical concepts
- Feel free to use developer slang, abbreviations, or humor when appropriate
- Be honest about what you can see in the code and what you can't
- If you see issues or have suggestions, mention them in a constructive way

Remember:
- Stick to what's in the code snippets provided
- Don't make up or assume code that isn't shown
- Use Markdown for code blocks with proper syntax highlighting
- Be helpful but not overly formal
- It's fine to say "I don't know" or "I'd need to see more code to answer that"

Your goal is to be that helpful teammate who really knows the codebase and explains things clearly without being patronizing.
`;
    }

    private buildUserPrompt(
        userQuery: string,
        codeContext: string,
        conversationHistory: string
    ): string {
        return `
${conversationHistory ? `### Conversation History\n${conversationHistory}\n\n` : ""}

### User Query
${userQuery}

### Relevant Code Snippets
${codeContext}

Based on the code snippets above, please answer the user's query.
`;
    }

    private formatCodeChunksForContext(chunks: any[]): string {
        return chunks
            .map((chunk, index) => {
                return `
[${index + 1}] File: ${chunk.path}
Lines: ${chunk.lineStart}-${chunk.lineEnd}
\`\`\`
${chunk.content}
\`\`\`
`;
            })
            .join("\n");
    }

    private formatConversationHistory(history: any[]): string {
        if (!history || history.length === 0) return "";

        return history
            .map((msg) => {
                const role = msg.role === "user" ? "User" : "Assistant";
                return `${role}: ${msg.content.replace(/\n/g, " ")}`;
            })
            .join("\n\n");
    }

    private extractCodeReferences(chunks: any[]): CodeReference[] {
        return chunks.slice(0, 5).map((chunk) => {
            // Trim content if too long
            let snippet = chunk.content;
            if (snippet.length > 500) {
                snippet = snippet.substring(0, 500) + "...";
            }

            return {
                path: chunk.path,
                snippet,
                lineNumbers: `${chunk.lineStart}-${chunk.lineEnd}`,
            };
        });
    }
}
