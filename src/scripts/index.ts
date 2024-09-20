import { Command } from "commander";
import { chunks } from "./chunks";
import { jira } from "./jira/jira";
import { run } from "./run";
import { pr } from "./pr";
import { ast } from "./ast";
import { tasksWGap } from "./assistants/tasks-w-gap";
import { tasksWCode } from "./assistants/tasks-w-code";
import { trimPrompt } from "./trim-prompt";

const program = new Command();

program.command("tasks-w-gap").action(tasksWGap);
program.command("tasks-w-code").action(tasksWCode);
program.command("jira").action(jira);
program.command("run").action(run);
program.command("pr").action(pr);
program.command("chunks").action(chunks);
program.command("ast").action(ast);
program.command("trim-prompt").action(trimPrompt);

program.parse(process.argv);
