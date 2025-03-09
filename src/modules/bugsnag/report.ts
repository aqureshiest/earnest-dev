import { getBugsnag } from "./config";

export function reportError(
    error: Error | string,
    metadata: Record<string, any> = {},
    severity: "error" | "warning" | "info" = "error"
) {
    const errorObj = typeof error === "string" ? new Error(error) : error;

    try {
        const bugsnag = getBugsnag();
        bugsnag.notify(errorObj, (event) => {
            event.severity = severity;
            // Add any metadata
            Object.entries(metadata).forEach(([section, data]) => {
                event.addMetadata(section, data);
            });
        });
    } catch (e) {
        // Ensure Bugsnag errors don't break application
        console.error("Bugsnag error reporting failed:", e);
    }

    return errorObj;
}
