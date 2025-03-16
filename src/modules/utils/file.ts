"use server";

async function readFileSafe(filePath: string) {
    if (typeof window !== "undefined") return null; // Prevents execution in the browser
    const fs = await import("fs/promises");
    return fs.readFile(filePath, "utf8");
}

async function writeFileSafe(filePath: string, content: string) {
    if (typeof window !== "undefined") return; // Prevents execution in the browser
    const fs = await import("fs/promises");
    await fs.writeFile(filePath, content, "utf8");
}

async function createDirectorySafe(dirPath: string) {
    if (typeof window !== "undefined") return; // Prevents execution in the browser
    const fs = await import("fs/promises");
    await fs.mkdir(dirPath, { recursive: true }); // Ensures the directory is created if it doesn't exist
}

async function fileExistsSafe(filePath: string) {
    if (typeof window !== "undefined") return false; // Prevents execution in the browser
    const fs = await import("fs/promises");
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

export { readFileSafe, writeFileSafe, createDirectorySafe, fileExistsSafe };
