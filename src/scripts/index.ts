import { Command } from "commander";
import { chunks } from "./chunks";
import { jira } from "./jira/jira";
import { run } from "./run";
import { pr } from "./pr";
import { ast } from "./ast";
import { trimPrompt } from "./trim-prompt";
import { codeMetadata } from "./codeMetadata";
import { misc } from "./misc";
import { codeanalysis } from "./audit/codeanalysis";
import { rds } from "./rds";
import { ext } from "./exts/ext";
import { analyzeIntMap } from "./int-tests/analyze-int-map";

const program = new Command();

program.command("jira").action(jira);
program.command("run").action(run);
program.command("pr").action(pr);
program.command("chunks").action(chunks);
program.command("ast").action(ast);
program.command("trim-prompt").action(trimPrompt);
program.command("code-metadata").action(codeMetadata);
program.command("misc").action(misc);
program.command("audit-analyze").action(codeanalysis);
program.command("rds").action(rds);

program.command("ext").action(ext);

// int tests
program.command("analyzeIntMap").action(analyzeIntMap);

program.parse(process.argv);
