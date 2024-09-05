export function parseDiff(text: string): string {
    // Extract the content between the ```diff``` tags
    const parsed = text.match(/```diff([\s\S]*?)```/);
    if (parsed && parsed[1]) {
        try {
            return parsed[1].trim();
        } catch (error) {
            console.error("Error in parsing diff", error);
            throw error;
        }
    } else {
        console.error("Diff tags not found or empty content.");
        throw new Error("Error in parsing Diff content");
    }
}
