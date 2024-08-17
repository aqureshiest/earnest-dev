export function parseMarkdown(text: string): string {
    // Extract the markdown content between the ```markdown``` tags
    const parsed = text.match(/```markdown([\s\S]*?)```/);
    if (parsed && parsed[1]) {
        try {
            return parsed[1].trim();
        } catch (error) {
            console.error("Error in parsing markdown", error);
            throw error;
        }
    } else {
        console.error("Markdown tags not found or empty content.");
        throw new Error("Error in parsing Markdown");
    }
}
