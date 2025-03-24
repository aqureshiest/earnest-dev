// load-test.ts
import fetch from "node-fetch";
import { v4 as uuidv4 } from "uuid";
import * as readline from "readline";
import { LLM_MODELS } from "@/modules/utils/llmInfo";

// Type definitions
interface TestConfig {
    initialRequests: number;
    rampUpFactor: number;
    maxConcurrent: number;
    timeoutMs: number;
    delayBetweenRequestsMs: number;
}

interface TestPayload {
    taskId: string;
    owner: string;
    repo: string;
    branch: string;
    selectedModel: string;
    question: string;
    conversationHistory: string[];
}

interface EventData {
    type: string;
    message?: string;
    content?: string;
}

interface ParsedEvent {
    type: string;
    data: EventData;
}

interface TestResult {
    taskId: string;
    success: boolean;
    duration: number;
    events?: number;
    error?: string;
    answer?: string; // Store the answer for building conversation history
}

// Configuration
const API_ENDPOINT = "http://localhost:3000/api/codebase-qa"; // Updated to correct endpoint path
const TEST_CONFIG: TestConfig = {
    initialRequests: 1, // Start with 1 request
    rampUpFactor: 10, // Scale up by this factor when ready
    maxConcurrent: 50, // Maximum concurrent requests
    timeoutMs: 60000 * 10, // Request timeout in milliseconds (2 minutes)
    delayBetweenRequestsMs: 1500, // Delay between starting requests
};

// Available real repos to test with
const REPOS = ["bookstore", "as-snapshot", "servicing-p-snapshot"];

// Sample questions to ask
const QUESTIONS = [
    "How does error handling work in this codebase?",
    "Explain the main architecture of this application",
    "What are the key data models used?",
    "What are the key APIs used?",
    "Can you suggest improvements to the codebase?",
    "Draw a sequence diagram for the main flow",
];

// Test payload template
const createTestPayload = (conversationHistory: string[] = []): TestPayload => {
    // Select a random repo and question
    const repo = REPOS[Math.floor(Math.random() * REPOS.length)];
    const question = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];

    return {
        taskId: uuidv4(),
        owner: process.env.NEXT_PUBLIC_GITHUB_OWNER!,
        repo: repo,
        branch: "main",
        selectedModel: LLM_MODELS.AWS_BEDROCK_CLAUDE_35_HAIKU_V2.id,
        question: question,
        conversationHistory: conversationHistory,
    };
};

// Parse SSE stream to get events
async function parseStream(response: any): Promise<ParsedEvent[]> {
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }

    // Use the text method to get the full response as text
    const text = await response.text();

    // Process the SSE format manually
    const events: ParsedEvent[] = [];
    const eventChunks = text.split("\n\n").filter((chunk: any) => chunk.trim() !== "");

    for (const chunk of eventChunks) {
        const lines = chunk.split("\n");
        let eventData: EventData | null = null;

        for (const line of lines) {
            if (line.startsWith("data: ")) {
                try {
                    const jsonStr = line.substring(6);
                    eventData = JSON.parse(jsonStr);
                } catch (e) {
                    console.error("Failed to parse event data:", line);
                }
            }
        }

        if (eventData) {
            events.push({
                type: eventData.type,
                data: eventData,
            });
        }
    }

    return events;
}

// Function to send a single request and validate response
async function sendRequest(payload: TestPayload): Promise<TestResult> {
    console.log(`Starting request for taskId: ${payload.taskId}`);
    const start = Date.now();

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TEST_CONFIG.timeoutMs);

        const response = await fetch(API_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "text/event-stream",
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Parse the SSE stream
        const events = await parseStream(response);

        // Validate events
        let hasAnswer = false;
        let hasError = false;
        let hasFinal = false;
        let answerContent = "";

        for (const event of events) {
            if (event.data?.type === "answer") {
                hasAnswer = true;
                answerContent = event.data.content || event.data.message || "";
            } else if (event.data?.type === "error") {
                hasError = true;
                console.error(`Error in request ${payload.taskId}:`, event.data.message);
            } else if (event.data?.type === "final") {
                hasFinal = true;
            }
        }

        const duration = Date.now() - start;

        return {
            taskId: payload.taskId,
            success: hasAnswer && hasFinal && !hasError,
            duration,
            events: events.length,
            answer: answerContent, // Store the answer for conversation history
        };
    } catch (error: any) {
        console.error(`Failed request ${payload.taskId}:`, error.message);
        return {
            taskId: payload.taskId,
            success: false,
            error: error.message,
            duration: Date.now() - start,
        };
    }
}

// Track conversation history for each repo
const conversationHistoryMap: Record<string, string[]> = {};

// Function to send a request and build conversation history
async function sendRequestWithHistory(count: number = 1): Promise<TestResult[]> {
    const results: TestResult[] = [];

    for (let i = 0; i < count; i++) {
        // Select a random repo from the list
        const repo = REPOS[Math.floor(Math.random() * REPOS.length)];

        // Get existing conversation history for this repo or create empty array
        const history = conversationHistoryMap[repo] || [];

        // Create payload with the history
        const payload = createTestPayload(history);

        console.log(
            `Request ${i + 1}/${count} for repo: ${payload.repo}, history length: ${
                history.length / 2
            } exchanges`
        );

        // Send the request
        const result = await sendRequest(payload);
        results.push(result);

        // If successful, update the conversation history for this repo
        if (result.success && result.answer) {
            // Add the question and answer to the history
            if (!conversationHistoryMap[repo]) {
                conversationHistoryMap[repo] = [];
            }

            // Add the current Q&A pair to history
            conversationHistoryMap[repo].push(payload.question);
            conversationHistoryMap[repo].push(result.answer);

            // Limit history to last 5 exchanges (10 items)
            if (conversationHistoryMap[repo].length > 10) {
                conversationHistoryMap[repo] = conversationHistoryMap[repo].slice(-10);
            }
        }

        // Delay before next request
        if (i < count - 1) {
            await new Promise((resolve) => setTimeout(resolve, TEST_CONFIG.delayBetweenRequestsMs));
        }
    }

    return results;
}

// Run a batch of tests with specified concurrency
async function runTestBatch(count: number, concurrentLimit: number = 10): Promise<TestResult[]> {
    const results: TestResult[] = [];

    // Process in smaller batches to build up conversation history
    const batchSize = Math.min(concurrentLimit, 5); // Smaller batch size for initial tests

    for (let i = 0; i < count; i += batchSize) {
        const currentBatchSize = Math.min(batchSize, count - i);
        console.log(`Processing batch ${Math.floor(i / batchSize) + 1}, size: ${currentBatchSize}`);

        // Process this batch in parallel
        const batchPromises = Array(currentBatchSize)
            .fill(null)
            .map((_, index) => {
                // Stagger the requests slightly
                return new Promise<TestResult>(async (resolve) => {
                    await new Promise((r) =>
                        setTimeout(r, index * TEST_CONFIG.delayBetweenRequestsMs)
                    );
                    const result = await sendRequestWithHistory(1);
                    resolve(result[0]);
                });
            });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
    }

    return results;
}

// Analyze and display test results
function analyzeResults(results: TestResult[]): void {
    const totalRequests = results.length;
    const successfulRequests = results.filter((r) => r.success).length;
    const failedRequests = totalRequests - successfulRequests;

    const durations = results.map((r) => r.duration);
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / totalRequests;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);

    console.log("\n==== TEST RESULTS ====");
    console.log(`Total Requests: ${totalRequests}`);
    console.log(
        `Successful: ${successfulRequests} (${((successfulRequests / totalRequests) * 100).toFixed(
            2
        )}%)`
    );
    console.log(
        `Failed: ${failedRequests} (${((failedRequests / totalRequests) * 100).toFixed(2)}%)`
    );
    console.log(`Average Duration: ${avgDuration.toFixed(2)}ms`);
    console.log(`Min Duration: ${minDuration}ms`);
    console.log(`Max Duration: ${maxDuration}ms`);

    if (failedRequests > 0) {
        console.log("\nFailed Requests:");
        results
            .filter((r) => !r.success)
            .forEach((r) => {
                console.log(`- TaskId: ${r.taskId}, Error: ${r.error || "No complete response"}`);
            });
    }
}

// Main load test function
async function runLoadTest(): Promise<void> {
    console.log(`Starting load test with ${TEST_CONFIG.initialRequests} initial requests`);
    console.log("======================================");

    try {
        // Phase 1: Initial test with a single request
        const initialResults = await runTestBatch(TEST_CONFIG.initialRequests);
        analyzeResults(initialResults);

        // Check if initial test was successful before scaling up
        const allInitialSuccessful = initialResults.every((r) => r.success);

        if (allInitialSuccessful) {
            console.log("\nInitial test successful. Ready to scale up.");
            const scaleUp = await askToScaleUp();

            if (scaleUp) {
                // Phase 2: Scale up test
                const scaledRequestCount = TEST_CONFIG.initialRequests * TEST_CONFIG.rampUpFactor;
                console.log(
                    `\nScaling up to ${scaledRequestCount} requests with max ${TEST_CONFIG.maxConcurrent} concurrent...`
                );
                const scaledResults = await runTestBatch(
                    scaledRequestCount,
                    TEST_CONFIG.maxConcurrent
                );
                analyzeResults(scaledResults);
            }
        } else {
            console.log("\nInitial test had failures. Fix issues before scaling up.");
        }
    } catch (error) {
        console.error("Load test failed:", error);
    }
}

// Helper function to prompt for scaling up
async function askToScaleUp(): Promise<boolean> {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        rl.question("Do you want to scale up the test? (y/n): ", (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === "y");
        });
    });
}

export const loadtest = () => {
    // Run the load test
    runLoadTest();
};
