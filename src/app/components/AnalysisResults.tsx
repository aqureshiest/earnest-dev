import React, { useState } from "react";
import {
    AlertOctagon,
    Lightbulb,
    FileCode,
    AlertCircle,
    ChevronDown,
    Filter,
    Info,
    CheckCircle,
    ExternalLink,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

import hljs from "highlight.js";
import "highlight.js/styles/github.css";

interface AnalysisResult {
    analysisType: string;
    response: AnalysisResponse;
}

interface AnalysisResultsProps {
    results: AnalysisResult[];
}

const CodeDialog: React.FC<{ code?: string; title: string; description?: string }> = ({
    code,
    title,
    description,
}) => {
    if (!code) return null;

    const renderContent = (code: string) => {
        const highlighted = hljs.highlightAuto(code).value;
        return <pre dangerouslySetInnerHTML={{ __html: highlighted }} />;
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                    View solution
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description && (
                        <p className="text-sm text-muted-foreground mt-2">{description}</p>
                    )}
                </DialogHeader>
                <ScrollArea className="mt-4 h-[calc(90vh-8rem)] rounded-md">
                    <div className="bg-[#f6f8fa] dark:bg-slate-900 border rounded-md">
                        <div className="flex items-center justify-between px-4 py-2 bg-[#f3f4f6] dark:bg-slate-800 border-b">
                            <span className="text-sm font-medium">Suggested fix</span>
                            <span className="text-xs text-muted-foreground">code</span>
                        </div>
                        <pre className="p-4 text-sm overflow-x-auto">{renderContent(code)}</pre>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};

const PriorityBadge: React.FC<{ priority: "high" | "medium" | "low" }> = ({ priority }) => {
    const config = {
        high: {
            icon: AlertCircle,
            text: "High",
            classes:
                "text-red-600 bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-900 dark:text-red-400",
        },
        medium: {
            icon: AlertCircle,
            text: "Medium",
            classes:
                "text-yellow-700 bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-900 dark:text-yellow-400",
        },
        low: {
            icon: Info,
            text: "Low",
            classes:
                "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-900 dark:text-blue-400",
        },
    }[priority];

    const Icon = config.icon;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger>
                    <div
                        className={`inline-flex items-center px-2 py-0.5 space-x-1 text-xs font-medium border rounded-full ${config.classes}`}
                    >
                        <Icon className="w-3 h-3" />
                        <span>{config.text}</span>
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{priority} priority issue</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};

const IssueRow: React.FC<{
    filename: string;
    issue: any;
    type: "violation" | "suggestion";
    repo?: string;
    branch?: string;
}> = ({ filename, issue, type, repo, branch }) => {
    const isViolation = type === "violation";
    const Icon = isViolation ? AlertOctagon : Lightbulb;
    const iconColor = isViolation
        ? "text-red-600 dark:text-red-400"
        : "text-green-600 dark:text-green-400";
    // const rowStyle = isViolation
    //     ? "hover:bg-red-50/50 dark:hover:bg-red-950/30"
    //     : "hover:bg-green-50/50 dark:hover:bg-green-950/30";

    const githubUrl =
        repo && branch
            ? `https://github.com/${process.env.NEXT_PUBLIC_GITHUB_OWNER}/${repo}/blob/${branch}/${filename}`
            : null;
    return (
        // ${rowStyle}
        <div className={`group py-4 px-6 border-b last:border-0 hover:bg-gray-50 `}>
            <div className="flex items-start space-x-4">
                <div className="pt-1">
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
                <div className="flex-1 min-w-0 space-y-4">
                    {/* Header with File Path */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center min-w-0 space-x-2">
                            <div className="flex items-center space-x-2">
                                <FileCode className="w-4 h-4 text-gray-500" />
                                <h3 className="font-mono text-sm font-semibold truncate">
                                    {filename}
                                </h3>
                                {githubUrl && (
                                    <a
                                        href={githubUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-500 hover:text-blue-600"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                )}
                            </div>
                            <PriorityBadge
                                priority={
                                    issue.priority ??
                                    issue.implementation?.priority ??
                                    issue.solution?.priority ??
                                    "medium"
                                }
                            />
                        </div>
                        <CodeDialog
                            code={isViolation ? issue.solution.code : issue.implementation.code}
                            title={`${isViolation ? "Solution" : "Implementation"} for ${filename}`}
                            description={isViolation ? issue.solution.description : undefined}
                        />
                    </div>

                    {/* Content */}
                    <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                            <span className="font-medium">{issue.pattern}</span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                            {isViolation ? issue.issue : issue.problem}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {isViolation ? issue.impact : issue.benefit}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface FilterState {
    priority: string[];
    type: string[];
}

const FilterButton: React.FC<{
    filters: FilterState;
    setFilters: (filters: FilterState) => void;
}> = ({ filters, setFilters }) => {
    const toggleFilter = (category: "priority" | "type", value: string) => {
        setFilters({
            ...filters,
            [category]: filters[category].includes(value)
                ? filters[category].filter((v) => v !== value)
                : [...filters[category], value],
        });
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                    <Filter className="w-4 h-4 mr-2" />
                    Filters
                    {(filters.priority.length > 0 || filters.type.length > 0) && (
                        <span className="ml-2 bg-blue-100 text-blue-600 rounded-full px-2 py-0.5 text-xs">
                            {filters.priority.length + filters.type.length}
                        </span>
                    )}
                    <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Priority</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => toggleFilter("priority", "high")}>
                    <div className="flex items-center">
                        {filters.priority.includes("high") && (
                            <CheckCircle className="w-4 h-4 mr-2" />
                        )}
                        High priority
                    </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toggleFilter("priority", "medium")}>
                    <div className="flex items-center">
                        {filters.priority.includes("medium") && (
                            <CheckCircle className="w-4 h-4 mr-2" />
                        )}
                        Medium priority
                    </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toggleFilter("priority", "low")}>
                    <div className="flex items-center">
                        {filters.priority.includes("low") && (
                            <CheckCircle className="w-4 h-4 mr-2" />
                        )}
                        Low priority
                    </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Type</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => toggleFilter("type", "violation")}>
                    <div className="flex items-center">
                        {filters.type.includes("violation") && (
                            <CheckCircle className="w-4 h-4 mr-2" />
                        )}
                        Violations only
                    </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toggleFilter("type", "suggestion")}>
                    <div className="flex items-center">
                        {filters.type.includes("suggestion") && (
                            <CheckCircle className="w-4 h-4 mr-2" />
                        )}
                        Opportunities only
                    </div>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

const AnalysisResults: React.FC<AnalysisResultsProps & { repo?: string; branch?: string }> = ({
    results,
    repo,
    branch,
}) => {
    const [filters, setFilters] = useState<FilterState>({
        priority: [],
        type: [],
    });

    const filterResults = (file_info: any[]) => {
        return file_info.map((file) => ({
            ...file,
            violations: {
                ...file.violations,
                pattern_violation: (file.violations?.pattern_violation || []).filter(
                    (violation: PatternViolation) =>
                        (filters.priority.length === 0 ||
                            filters.priority.includes(violation.priority)) &&
                        (filters.type.length === 0 || filters.type.includes("violation"))
                ),
            },
            opportunities: {
                ...file.opportunities,
                suggestion: (file.opportunities?.suggestion || []).filter(
                    (suggestion: Suggestion) =>
                        (filters.priority.length === 0 ||
                            filters.priority.includes(suggestion.priority)) &&
                        (filters.type.length === 0 || filters.type.includes("suggestion"))
                ),
            },
        }));
    };

    return (
        <div className="space-y-6">
            <Tabs defaultValue={results[0].analysisType}>
                <div className="flex items-center justify-between mb-6">
                    <TabsList className="h-8">
                        {results.map((result) => (
                            <TabsTrigger
                                key={result.analysisType}
                                value={result.analysisType}
                                className="capitalize text-sm"
                            >
                                {result.analysisType} Analysis
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    <FilterButton filters={filters} setFilters={setFilters} />
                </div>

                {results.map((result) => (
                    <TabsContent key={result.analysisType} value={result.analysisType}>
                        <div className="border rounded-lg bg-white dark:bg-slate-950 divide-y divide-gray-200 dark:divide-gray-800">
                            {/* Violations Section */}
                            {filterResults(result.response.analysis.file_info).some(
                                (file) => file.violations?.pattern_violation?.length > 0
                            ) && (
                                <div>
                                    <div className="px-6 py-3 bg-red-50 dark:bg-red-950/30 border-b border-red-100 dark:border-red-900/30">
                                        <div className="flex items-center space-x-2">
                                            <AlertOctagon className="w-5 h-5 text-red-600 dark:text-red-400" />
                                            <h3 className="font-semibold text-red-800 dark:text-red-200">
                                                Violations
                                            </h3>
                                        </div>
                                    </div>
                                    {filterResults(result.response.analysis.file_info).map(
                                        (file) => {
                                            const violations =
                                                file.violations?.pattern_violation || [];
                                            return violations.map((violation: PatternViolation) => (
                                                <IssueRow
                                                    key={`${file.filename}-${violation.pattern}`}
                                                    filename={file.filename}
                                                    issue={violation}
                                                    type="violation"
                                                    repo={repo}
                                                    branch={branch}
                                                />
                                            ));
                                        }
                                    )}
                                </div>
                            )}

                            {/* Opportunities Section */}
                            {filterResults(result.response.analysis.file_info).some(
                                (file) => file.opportunities?.suggestion?.length > 0
                            ) && (
                                <div>
                                    <div className="px-6 py-3 bg-green-50 dark:bg-green-950/30 border-b border-green-100 dark:border-green-900/30">
                                        <div className="flex items-center space-x-2">
                                            <Lightbulb className="w-5 h-5 text-green-600 dark:text-green-400" />
                                            <h3 className="font-semibold text-green-800 dark:text-green-200">
                                                Opportunities
                                            </h3>
                                        </div>
                                    </div>
                                    {filterResults(result.response.analysis.file_info).map(
                                        (file) => {
                                            const suggestions =
                                                file.opportunities?.suggestion || [];
                                            return suggestions.map((suggestion: Suggestion) => (
                                                <IssueRow
                                                    key={`${file.filename}-${suggestion.pattern}`}
                                                    filename={file.filename}
                                                    issue={suggestion}
                                                    type="suggestion"
                                                    repo={repo}
                                                    branch={branch}
                                                />
                                            ));
                                        }
                                    )}
                                </div>
                            )}

                            {result.response.analysis.file_info.every(
                                (file) =>
                                    !file.violations?.pattern_violation?.length &&
                                    !file.opportunities?.suggestion?.length
                            ) && (
                                <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                    <div className="max-w-sm mx-auto space-y-3">
                                        <CheckCircle className="w-12 h-12 mx-auto opacity-50" />
                                        <p className="text-lg font-medium">No issues found</p>
                                        <p className="text-sm">
                                            All checks have passed for this analysis type.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
};

export default AnalysisResults;
