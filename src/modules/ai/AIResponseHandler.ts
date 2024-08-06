interface FileDetail {
    path: string;
    language: string;
    content: string;
    status: string;
}

interface ParsedResponse {
    files: FileDetail[];
    prTitle: string;
}

export function parseAIResponse(response: string): ParsedResponse {
    const fileListRegex = /files:\s*\n((?:\s*-\s*path:.*\n\s*status:.*\n)*)/;
    const fileDetailRegex =
        /file:\s*\n\s*path:\s*"(.*)"\s*\n\s*language:\s*"(.*)"\s*\n\s*content:\s*\|([^]+?)status:\s*"(.*)"/g;
    const prTitleRegex = /pr_title:\s*"(.*)"/;

    const files: FileDetail[] = [];
    const fileListMatch = response.match(fileListRegex);
    if (fileListMatch && fileListMatch[1]) {
        const fileDetails = fileListMatch[1].match(fileDetailRegex);
        if (fileDetails) {
            fileDetails.forEach((fileDetail) => {
                const fileDetailMatch = fileDetailRegex.exec(fileDetail);
                if (fileDetailMatch) {
                    files.push({
                        path: fileDetailMatch[1].trim(),
                        language: fileDetailMatch[2].trim(),
                        content: fileDetailMatch[3].trim(),
                        status: fileDetailMatch[4].trim(),
                    });
                }
            });
        }
    }

    const prTitleMatch = response.match(prTitleRegex);
    const prTitle = prTitleMatch ? prTitleMatch[1].trim() : "";

    return {
        files,
        prTitle,
    };
}
