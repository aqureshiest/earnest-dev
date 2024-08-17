export function formatFiles(files: FileDetails[]) {
    return files.map((file) => `**File: ${file.path}**\n${file.content}`).join("\n\n");
}
