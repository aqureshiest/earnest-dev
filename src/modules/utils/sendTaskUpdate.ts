const clients = new Map<string, ReadableStreamDefaultController<any>>();

export function sendTaskUpdate(taskId: string, type: string, message: any) {
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
        console.log(`Message for task ${taskId}, type ${type}:`, message);
    }
}

export function setClient(taskId: string, controller: ReadableStreamDefaultController<any>) {
    clients.set(taskId, controller);
}

export function deleteClient(taskId: string) {
    clients.delete(taskId);
}
