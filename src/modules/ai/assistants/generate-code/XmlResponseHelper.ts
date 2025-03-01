export const isResponseTruncated = (response: string): boolean => {
    // Check for key section tags
    const hasCodeChangesOpen = response.includes("<code_changes>");
    const hasCodeChangesClose = response.includes("</code_changes>");

    if (hasCodeChangesOpen && !hasCodeChangesClose) {
        return true;
    }

    // Check for section tags
    const sections = ["new_files", "modified_files", "deleted_files"];
    for (const section of sections) {
        if (response.includes(`<${section}>`) && !response.includes(`</${section}>`)) {
            return true;
        }
    }

    // Check for unclosed file tags
    const fileOpenCount = (response.match(/<file>/g) || []).length;
    const fileCloseCount = (response.match(/<\/file>/g) || []).length;
    if (fileOpenCount > fileCloseCount) {
        return true;
    }

    // Check for unclosed CDATA sections
    const cdataOpenCount = (response.match(/<!\[CDATA\[/g) || []).length;
    const cdataCloseCount = (response.match(/\]\]>/g) || []).length;
    if (cdataOpenCount > cdataCloseCount) {
        return true;
    }

    // Check if the response ends abruptly in the middle of a tag
    const lastClosingTag = response.lastIndexOf("</");
    if (lastClosingTag === -1) {
        // No closing tags at all, might be truncated
        return true;
    }

    // Look for unclosed content tags
    if (response.includes("<content>") && !response.includes("</content>")) {
        return true;
    }

    // Look for unclosed thoughts tags
    if (response.includes("<thoughts>") && !response.includes("</thoughts>")) {
        return true;
    }

    return false;
};

export const extractCompleteFilesFromTruncated = (response: string): CodeChanges => {
    // Create a default result with a warning title
    const result: CodeChanges = {
        title: "Partial Results (Response Truncated)",
        newFiles: [],
        modifiedFiles: [],
        deletedFiles: [],
    };

    try {
        // Try to extract the title if available
        const titleMatch = response.match(/<title>(.*?)<\/title>/);
        if (titleMatch && titleMatch[1]) {
            result.title = `${titleMatch[1]} (Partial Results - Response Truncated)`;
        }

        // Extract complete new files
        extractCompleteNewFiles(response, result);

        // Extract complete modified files
        extractCompleteModifiedFiles(response, result);

        // Extract complete deleted files
        extractCompleteDeletedFiles(response, result);

        console.log(
            `Extracted ${result.newFiles.length} new files, ${result.modifiedFiles.length} modified files, and ${result.deletedFiles.length} deleted files from truncated response`
        );

        return result;
    } catch (error) {
        console.error("Error extracting files from truncated response:", error);
        return result;
    }
};

export const extractCompleteNewFiles = (response: string, result: CodeChanges): void => {
    // Pattern to match complete new file entries - improved regex
    const filePattern =
        /<file>[\s\S]*?<path>(.*?)<\/path>[\s\S]*?<thoughts>([\s\S]*?)<\/thoughts>[\s\S]*?<content>[\s\S]*?<!\[CDATA\[([\s\S]*?)\]\]>[\s\S]*?<\/content>[\s\S]*?<\/file>/g;

    // Only look in the new_files section if it exists
    const newFilesSection = extractSection(response, "new_files");

    if (newFilesSection) {
        let match;
        while ((match = filePattern.exec(newFilesSection)) !== null) {
            result.newFiles.push({
                path: match[1],
                thoughts: match[2],
                content: match[3].trim(),
            });
        }
    } else {
        // Fallback: Try to find files in the entire response if no section is found
        let match;
        while ((match = filePattern.exec(response)) !== null) {
            // Only add if it appears to be a complete file
            if (match[1] && match[2] && match[3]) {
                result.newFiles.push({
                    path: match[1],
                    thoughts: match[2],
                    content: match[3].trim(),
                });
            }
        }
    }
};

export const extractCompleteModifiedFiles = (response: string, result: CodeChanges): void => {
    // Pattern to match complete modified file entries
    const filePattern =
        /<file>[\s\S]*?<path>(.*?)<\/path>[\s\S]*?<thoughts>([\s\S]*?)<\/thoughts>[\s\S]*?<content>[\s\S]*?<!\[CDATA\[([\s\S]*?)\]\]>[\s\S]*?<\/content>[\s\S]*?<\/file>/g;

    // Only look in the modified_files section if it exists
    const modifiedFilesSection = extractSection(response, "modified_files");

    if (modifiedFilesSection) {
        const matches = Array.from(modifiedFilesSection.matchAll(filePattern));

        for (const match of matches) {
            result.modifiedFiles.push({
                path: match[1],
                thoughts: match[2],
                content: match[3].trim(),
            });
        }
    }
};

export const extractCompleteDeletedFiles = (response: string, result: CodeChanges): void => {
    // Pattern to match complete deleted file entries
    const filePattern = /<file>[\s\S]*?<path>(.*?)<\/path>[\s\S]*?<\/file>/g;

    // Only look in the deleted_files section if it exists
    const deletedFilesSection = extractSection(response, "deleted_files");

    if (deletedFilesSection) {
        const matches = Array.from(deletedFilesSection.matchAll(filePattern));

        for (const match of matches) {
            result.deletedFiles.push({
                path: match[1],
            });
        }
    }
};

export const extractSection = (response: string, sectionName: string): string | null => {
    const sectionStart = response.indexOf(`<${sectionName}>`);
    if (sectionStart === -1) return null;

    const sectionEnd = response.indexOf(`</${sectionName}>`, sectionStart);
    if (sectionEnd === -1) return null;

    return response.substring(sectionStart + sectionName.length + 2, sectionEnd);
};
