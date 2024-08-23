/**
 * format files in an xml format
 * <file>
 * <path>path</path>
 * <content>content</content>
 * </file>
 */
export function formatFiles(files: FileDetails[]) {
    return files
        .map(
            (file) =>
                `<file>\n<file_path>${file.path}</file_path>\n<file_contents>${file.content}</file_contents>\n</file>`
        )
        .join("\n\n");
}
