const clients = new Map<string, WritableStreamDefaultWriter<any>>();

export function sendTaskUpdate(taskId: string, type: string, message: any) {
    const writer = clients.get(taskId);
    if (writer) {
        try {
            writer.write(`data: ${JSON.stringify({ type, taskId, message })}\n\n`);
        } catch (error) {
            console.error("Error sending SSE update:", error);
            writer.abort(new Error("Failed to send update"));
        }
    }
}

export function setClient(taskId: string, writer: WritableStreamDefaultWriter<any>) {
    clients.set(taskId, writer);
}

export function deleteClient(taskId: string) {
    clients.delete(taskId);
}
