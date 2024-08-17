import fs from "fs";
import path from "path";
import yaml from "js-yaml";

export enum SUPPORTED_FILE_EXTENSIONS {
    TXT = "txt",
    YAML = "yaml",
    MD = "md",
}

export function saveRunInfo<T>(
    model: string,
    task: string,
    assistant: string,
    infoType: string,
    info: T,
    infoExtension: string = "txt"
) {
    // replace any non alphabetic characters with underscores
    const task_dir = task
        .trim()
        .replace(/[^a-zA-Z]/g, "_")
        .slice(0, 50);

    // timestamp as milliseconds as string
    const timestamp = Date.now().toString();

    // create directory for this run in the root directory
    const runDir = path.join(process.cwd(), "runs", task_dir, assistant.toLowerCase());

    // mk dirs
    fs.mkdirSync(runDir, { recursive: true });

    // make sure it exists
    if (!fs.existsSync(runDir)) {
        console.error("Unable to create Run directory");
        return;
    }

    // create a new file in the runDir
    const runInfoFile = path.join(runDir, `${infoType}_${timestamp}.${infoExtension}`);

    let infoString = "";

    if (infoExtension === SUPPORTED_FILE_EXTENSIONS.YAML) {
        infoString = yaml.dump(info);
    } else if (infoExtension === SUPPORTED_FILE_EXTENSIONS.MD) {
        infoString = info as string;
    } else if (infoExtension === SUPPORTED_FILE_EXTENSIONS.TXT) {
        infoString = info as string;
    }

    fs.writeFileSync(runInfoFile, infoString.trim());
}

export function getRunInfo<T = string>(
    model: string,
    task: string,
    assistant: string,
    infoType: string
) {
    const task_dir = task
        .trim()
        .replace(/[^a-zA-Z]/g, "_")
        .slice(0, 50);

    // look up run directory
    const runDir = path.join(process.cwd(), "runs", task_dir, assistant.toLowerCase());

    // make sure it exists
    if (!fs.existsSync(runDir)) {
        console.error(`Run dir ${runDir} does not exist`);
        return;
    }

    // look for the supported file
    for (const ext of Object.values(SUPPORTED_FILE_EXTENSIONS)) {
        const runInfoFile = path.join(runDir, `${infoType}.${ext}`);
        if (fs.existsSync(runInfoFile)) {
            return fs.readFileSync(runInfoFile, "utf-8") as T;
        }
    }
}
