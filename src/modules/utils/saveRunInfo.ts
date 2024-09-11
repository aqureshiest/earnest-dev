import yaml from "js-yaml";
import { XMLBuilder } from "fast-xml-parser";
// import path from "path";
// import fs from "fs";

export enum EXTS {
    TXT = "txt",
    YAML = "yaml",
    MD = "md",
    XML = "xml",
}

export function saveRunInfo<R extends TaskRequest, T>(
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

    // convert info to string
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
    } else {
        infoString = info as string;
    }

    // if (writeToFile === "true") {
    //     // create directory for this run in the root directory
    //     const runDir = path.join(process.cwd(), "runs", taskId, assistant.toLowerCase());

    //     // check if dir already exists
    //     if (!fs.existsSync(runDir)) {
    //         // mk dirs
    //         fs.mkdirSync(runDir, { recursive: true });

    //         // exclude last dir from runDir
    //         const dirs = runDir.split(path.sep);
    //         const taskDir = dirs.slice(0, dirs.length - 1).join(path.sep);

    //         // write a text file that contains the task and model
    //         const runInfoFile = path.join(taskDir, "info.txt");
    //         const runInfo = `Task: ${task}\nModel: ${model}\n`;
    //         fs.writeFileSync(runInfoFile, runInfo);
    //     }

    //     // make sure it exists
    //     if (!fs.existsSync(runDir)) {
    //         console.error("Unable to create Run directory");
    //         return;
    //     }

    //     // create a new file in the runDir
    //     const runInfoFile = path.join(runDir, `${infoType}.${infoExtension}`);

    //     fs.writeFileSync(runInfoFile, infoString.trim());
    // }

    if (writeToConsole === "true") {
        // output to console
        console.log(`[${taskId}] [${assistant}] ${infoType}:\n${infoString.trim()}`);
    }
}
