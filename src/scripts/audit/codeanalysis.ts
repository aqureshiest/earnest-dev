import { PerformCodeAnalysis } from "@/modules/ai/PerformCodeAnalysis";
import { PrepareCodebase } from "@/modules/ai/PrepareCodebase";
import { LLM_MODELS } from "@/modules/utils/llmInfo";

export const codeanalysis = async () => {
    try {
        const repo = "laps-snapshot";

        const analyze: CodeAnalysisRequest = {
            taskId: Date.now().toString(),
            owner: "aqureshiest",
            repo: repo,
            branch: "main",
            task: "",
            model: LLM_MODELS.ANTHROPIC_CLAUDE_3_5_HAIKU_NEW,
            files: [],
            analysisTypes: ["resiliency"],
        };

        const prepareCodebase = new PrepareCodebase();
        const files = await prepareCodebase.prepare(analyze);

        analyze.files = files;

        const codeAnalyzer = new PerformCodeAnalysis();
        const analyses = await codeAnalyzer.runAnalysis(analyze);

        // printAnalysisReport(analyses?.response);
    } catch (error) {
        console.error("Error:", error);
    }
};

import chalk from "chalk";
import { table } from "table";

function getPriorityColor(priority: "high" | "medium" | "low"): string {
    switch (priority) {
        case "high":
            return chalk.red(priority);
        case "medium":
            return chalk.yellow(priority);
        case "low":
            return chalk.green(priority);
    }
}

export function printAnalysisReport(response: AnalysisResponse | null | undefined): void {
    console.log(chalk.bold.blue("\n=== Code Analysis Report ===\n"));

    response?.analysis.file_info.forEach((fileInfo) => {
        console.log(chalk.yellow(`\nFile: ${fileInfo.filename}`));

        if (fileInfo.violations.pattern_violation.length > 0) {
            console.log(chalk.red("\nPattern Violations:"));
            const violationsData = fileInfo.violations.pattern_violation.map((v) => [
                chalk.bold(v.pattern),
                v.location,
                v.issue,
                getPriorityColor(v.priority),
            ]);

            console.log(table([["Pattern", "Location", "Issue", "Priority"], ...violationsData]));
        }

        if (fileInfo.opportunities.suggestion.length > 0) {
            console.log(chalk.green("\nImprovement Opportunities:"));
            const suggestionsData = fileInfo.opportunities.suggestion.map((s) => [
                chalk.bold(s.pattern),
                s.location,
                s.problem,
                getPriorityColor(s.priority),
            ]);

            console.log(
                table([["Pattern", "Location", "Problem", "Priority"], ...suggestionsData])
            );
        }
    });

    // Print summary
    const totalViolations = response?.analysis.file_info.reduce(
        (acc, file) =>
            acc +
            (Array.isArray(file.violations.pattern_violation)
                ? file.violations.pattern_violation.length
                : 0),
        0
    );
    const totalOpportunities = response?.analysis.file_info.reduce(
        (acc, file) =>
            acc +
            (Array.isArray(file.opportunities.suggestion)
                ? file.opportunities.suggestion.length
                : 0),
        0
    );

    console.log(chalk.bold.blue("\nSummary:"));
    console.log(`Total Files Analyzed: ${response?.analysis.file_info.length}`);
    console.log(`Total Pattern Violations: ${chalk.red(totalViolations)}`);
    console.log(`Total Improvement Opportunities: ${chalk.green(totalOpportunities)}`);
}
