import yaml from "js-yaml";
import { XMLBuilder } from "fast-xml-parser";
import path from "path";
import { createDirectorySafe, fileExistsSafe, writeFileSafe } from "./file";
import { write } from "fs";

export enum EXTS {
    TXT = "txt",
    YAML = "yaml",
    MD = "md",
    XML = "xml",
    JSON = "json",
}

export async function saveRunInfo<R extends TaskRequest, T>(
    request: R,
    assistant: string,
    infoType: string,
    info: T,
    infoExtension: string = "txt"
) {
    const writeToFile = process.env.WRITE_RUN_INFO_TO_FILE;
    const writeToConsole = process.env.WRITE_RUN_INFO_TO_CONSOLE;

    if (writeToFile !== "true" && writeToConsole !== "true") {
        return;
    }

    const { taskId, task, model } = request;

    // Convert info to string based on extension
    let infoString = "";
    if (infoExtension === EXTS.YAML) {
        infoString = yaml.dump(info);
    } else if (infoExtension === EXTS.MD) {
        infoString = info as string;
    } else if (infoExtension === EXTS.XML) {
        const builder = new XMLBuilder({
            ignoreAttributes: false,
            format: true,
            indentBy: "  ",
        });
        infoString = builder.build(info) as string;
    } else if (infoExtension === EXTS.JSON) {
        infoString = JSON.stringify(info, null, 2);
    } else {
        infoString = info as string;
    }

    if (writeToFile === "true") {
        // Create directory for this run
        const runDir = path.join(process.cwd(), "runs", taskId, assistant.toLowerCase());

        // Ensure the directory exists
        const exists = await fileExistsSafe(runDir);
        if (!exists) {
            await createDirectorySafe(runDir);
        }

        // Make sure it was created successfully
        const dirStillExists = await fileExistsSafe(runDir);
        if (!dirStillExists) {
            console.error("Unable to create Run directory");
            return;
        }

        // Create task info file
        const dirs = runDir.split(path.sep);
        const taskDir = dirs.slice(0, dirs.length - 1).join(path.sep);
        const runInfoFile = path.join(taskDir, "info.txt");
        const runInfo = `Task: ${task}\nModel: ${model}\n`;

        await writeFileSafe(runInfoFile, runInfo);

        // Create the final run info file
        const finalFilePath = path.join(runDir, `${infoType}.${infoExtension}`);
        await writeFileSafe(finalFilePath, infoString.trim());
    }

    if (writeToConsole === "true") {
        console.log(`[${taskId}] [${assistant}] ${infoType}:\n${infoString.trim()}`);
    }
}
