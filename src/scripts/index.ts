import { Command } from "commander";
import { chunks } from "./chunks";
import { jira } from "./jira/jira";
import { run } from "./run";
import { pr } from "./pr";
import { ast } from "./ast";
import { tasksWCode } from "./assistants/tasks-w-code";
import { trimPrompt } from "./trim-prompt";
import { codeMetadata } from "./codeMetadata";
import { CA } from "./assistants/ca";
import { misc } from "./misc";
import { codeanalysis } from "./audit/codeanalysis";
import { rds } from "./rds";
import { vectorsearch } from "./vectorsearch";
import { ext } from "./exts/ext";
import { prd } from "./prd/prd";

const program = new Command();

program.command("tasks-w-code").action(tasksWCode);
program.command("jira").action(jira);
program.command("run").action(run);
program.command("pr").action(pr);
program.command("chunks").action(chunks);
program.command("ast").action(ast);
program.command("trim-prompt").action(trimPrompt);
program.command("code-metadata").action(codeMetadata);
program.command("ca").action(CA);
program.command("misc").action(misc);
program.command("audit-analyze").action(codeanalysis);
program.command("rds").action(rds);
program.command("vectorsearch").action(vectorsearch);

program.command("ext").action(ext);

program.command("prd").action(prd);

program.parse(process.argv);
