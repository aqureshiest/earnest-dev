import Redis from "ioredis";
import { v4 as uuidv4 } from "uuid";

// Initialize Redis client
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
const pub = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

// Constants
const TASK_MESSAGE_KEY = "task:messages:"; // For storing task messages
const TASK_STATUS_KEY = "task:status:"; // For storing task status
const TASK_EXPIRY = 60 * 60 * 24; // 24 hours expiry for task data

// Task status enum
export enum TaskStatus {
    PENDING = "pending",
    IN_PROGRESS = "in_progress",
    COMPLETED = "completed",
    ERROR = "error",
}

// Task data types to store in Redis
export interface TaskData {
    id: string;
    startedAt: number;
    completedAt?: number;
    description?: string;
    repo?: string;
    branch?: string;
    owner?: string;
    model?: string;
}

// Map to store active client controllers
const clients = new Map<string, ReadableStreamDefaultController<any>>();

// Keys for different Redis data types
const TASK_DATA_KEY = "task:data:"; // For storing task metadata

/**
 * Generate a new task ID
 */
export function generateTaskId(): string {
    return uuidv4();
}

/**
 * Store a message for a task
 */
export async function storeTaskMessage(taskId: string, type: string, message: any): Promise<void> {
    const taskMessage = {
        type,
        taskId,
        message,
        timestamp: Date.now(),
    };

    // Store message in Redis list
    await redis.rpush(`${TASK_MESSAGE_KEY}${taskId}`, JSON.stringify(taskMessage));

    // Set expiry to avoid accumulating old messages indefinitely
    await redis.expire(`${TASK_MESSAGE_KEY}${taskId}`, TASK_EXPIRY);

    // Publish message to Redis channel for real-time updates
    await pub.publish(`task-updates:${taskId}`, JSON.stringify(taskMessage));
}

/**
 * Get all messages for a task
 */
export async function getTaskMessages(taskId: string): Promise<any[]> {
    const messages = await redis.lrange(`${TASK_MESSAGE_KEY}${taskId}`, 0, -1);
    return messages.map((message) => JSON.parse(message));
}

/**
 * Set task status
 */
export async function setTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
    await redis.set(`${TASK_STATUS_KEY}${taskId}`, status);
    await redis.expire(`${TASK_STATUS_KEY}${taskId}`, TASK_EXPIRY);
}

/**
 * Get task status
 */
export async function getTaskStatus(taskId: string): Promise<string | null> {
    return redis.get(`${TASK_STATUS_KEY}${taskId}`);
}

/**
 * Send task update via SSE and store in Redis
 */
export async function sendTaskUpdate(taskId: string, type: string, message: any): Promise<void> {
    // Store message in Redis
    await storeTaskMessage(taskId, type, message);

    // Send message to connected client if it exists
    const controller = clients.get(taskId);
    if (controller) {
        try {
            controller.enqueue(`data: ${JSON.stringify({ type, taskId, message })}\n\n`);
        } catch (error) {
            console.error("Error sending SSE update:", error);
            controller.error(new Error("Failed to send update"));
            clients.delete(taskId);
        }
    } else {
        console.log(`Message for task ${taskId}, type ${type} stored in Redis (no active client)`);
    }
}

/**
 * Register a client controller for SSE
 */
export function setClient(taskId: string, controller: ReadableStreamDefaultController<any>): void {
    clients.set(taskId, controller);
}

/**
 * Remove a client controller
 */
export function deleteClient(taskId: string): void {
    clients.delete(taskId);
}

/**
 * Check if a task exists and is active
 */
export async function isTaskActive(taskId: string): Promise<boolean> {
    const status = await getTaskStatus(taskId);
    return status === TaskStatus.PENDING || status === TaskStatus.IN_PROGRESS;
}

/**
 * Store task metadata
 */
export async function storeTaskData(taskId: string, data: TaskData): Promise<void> {
    await redis.set(`${TASK_DATA_KEY}${taskId}`, JSON.stringify(data));
    await redis.expire(`${TASK_DATA_KEY}${taskId}`, TASK_EXPIRY);
}

/**
 * Get task metadata
 */
export async function getTaskData(taskId: string): Promise<TaskData | null> {
    const data = await redis.get(`${TASK_DATA_KEY}${taskId}`);
    return data ? JSON.parse(data) : null;
}

/**
 * Update task completion status
 */
export async function completeTask(taskId: string): Promise<void> {
    // Update the task status
    await setTaskStatus(taskId, TaskStatus.COMPLETED);

    // Update the task data with completion timestamp
    const taskData = await getTaskData(taskId);
    if (taskData) {
        taskData.completedAt = Date.now();
        await storeTaskData(taskId, taskData);
    }
}

/**
 * Create a Redis subscription for task updates
 */
export function createTaskSubscription(
    taskId: string,
    controller: ReadableStreamDefaultController<any>
): Redis {
    const sub = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

    sub.subscribe(`task-updates:${taskId}`, (err) => {
        if (err) {
            console.error(`Error subscribing to task ${taskId}:`, err);
            return;
        }
        console.log(`Subscribed to updates for task ${taskId}`);
    });

    sub.on("message", (_channel, message) => {
        try {
            controller.enqueue(`data: ${message}\n\n`);
        } catch (error) {
            console.error("Error sending subscribed SSE update:", error);
            sub.unsubscribe();
            sub.quit();
        }
    });

    return sub;
}
