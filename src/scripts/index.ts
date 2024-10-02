import { Command } from "commander";
import { chunks } from "./chunks";
import { jira } from "./jira/jira";
import { run } from "./run";
import { pr } from "./pr";
import { ast } from "./ast";
import { tasksWGap } from "./assistants/tasks-w-gap";
import { tasksWCode } from "./assistants/tasks-w-code";
import { trimPrompt } from "./trim-prompt";
import { codeMetadata } from "./codeMetadata";
import { CA } from "./assistants/ca";
import { pdf } from "./assistants/pdf";
import { cacheTest } from "./cache-test";

const program = new Command();

program.command("tasks-w-gap").action(tasksWGap);
program.command("tasks-w-code").action(tasksWCode);
program.command("jira").action(jira);
program.command("run").action(run);
program.command("pr").action(pr);
program.command("chunks").action(chunks);
program.command("ast").action(ast);
program.command("trim-prompt").action(trimPrompt);
program.command("code-metadata").action(codeMetadata);
program.command("ca").action(CA);
program.command("pdf").action(pdf);
program.command("cache-test").action(cacheTest);

program.parse(process.argv);
