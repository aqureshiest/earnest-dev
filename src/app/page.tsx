"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Code,
    Ticket,
    ArrowRight,
    Terminal,
    Briefcase,
    Sparkles,
    CodeIcon,
    BadgeCheck,
    ChevronDown,
    Brain,
    TestTubeIcon,
    TestTube2,
    TestTubeDiagonal,
    Cable,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const HomePage: React.FC = () => {
    const [activeTab, setActiveTab] = useState("developer"); // Default to "developer"
    const [mounted, setMounted] = useState(false);

    // Load the active tab from localStorage after the component mounts
    useEffect(() => {
        if (typeof window === "undefined") return;

        const saved = localStorage.getItem("earnest-ai-active-tab");
        if (saved) setActiveTab(saved);

        setMounted(true); // Mark as mounted to prevent flickering
    }, []);

    useEffect(() => {
        if (mounted) {
            localStorage.setItem("earnest-ai-active-tab", activeTab);
        }
    }, [activeTab, mounted]);

    if (!mounted) return null; // Prevents mismatched SSR and client rendering

    // Workspace options for the dropdown
    const workspaces = [
        {
            id: "developer",
            label: "Developer Workspace",
            icon: <Terminal className="h-4 w-4 ml-1" />,
        },
        {
            id: "management",
            label: "Manager Workspace",
            icon: <Briefcase className="h-4 w-4 ml-1" />,
        },
        {
            id: "qe",
            label: "QE Workspace",
            icon: <TestTubeDiagonal className="h-4 w-4 ml-1" />,
        },
        // Easy to add more workspaces here
    ];

    // Get the current workspace label and icon
    const currentWorkspace =
        workspaces.find((workspace) => workspace.id === activeTab) || workspaces[0];

    const devTools = [
        {
            href: "/pullrequest/v2",
            dashboardHref: "/pullrequest/v2/dashboard",
            icon: <CodeIcon className="h-6 w-6 text-blue-500" />,
            title: "Generate Code And PR",
            description: "can handle complex tasks",
            content:
                "Generate code and pull requests for your tasks using AI-powered code generation.",
            buttonText: "Create Pull Request",
            status: "ready" as const,
        },
        {
            href: "/codebase-qa",
            dashboardHref: "/codebase-qa/dashboard",
            icon: <Brain className="h-6 w-6 text-green-500" />,
            title: "Codebase Q&A",
            description: "Ask questions about your codebase",
            content:
                "Interact with your codebase using natural language and get answers to your questions.",
            buttonText: "Ask a Question",
            status: "ready" as const,
        },
        // {
        //     href: "/code-analysis",
        //     icon: <BadgeCheck className="h-6 w-6 text-purple-500" />,
        //     title: "Design Patterns Analysis",
        //     description: "AI-powered design pattern analysis",
        //     content:
        //         "Analyze your codebase for design patterns and get insights on how to improve your code quality",
        //     buttonText: "Audit Repository",
        //     status: "development" as const,
        //     variant: "outline" as const,
        // },
    ];

    const pmTools = [
        {
            href: "/prd",
            dashboardHref: "/prd/dashboard",
            icon: <Sparkles className="h-6 w-6 text-amber-500" />,
            title: "AI PRD Generator",
            description: "Convert designs to PRDs",
            content: "Generate PRD documents from design files and feature descriptions using AI.",
            buttonText: "Generate PRD",
            status: "ready" as const,
            variant: "default" as const,
        },
        // {
        //     href: "/jiratickets",
        //     icon: <Ticket className="h-6 w-6 text-blue-500" />,
        //     title: "AI Jira Tickets",
        //     description: "Automated project planning assistant",
        //     content:
        //         "Transform technical design documents into well-structured Jira epics and tickets with intelligent task breakdown and estimation.",
        //     buttonText: "Generate Tickets",
        //     status: "development" as const,
        //     variant: "outline" as const,
        // },
    ];

    const qeTools = [
        {
            href: "/integration-tests",
            icon: <Cable className="h-6 w-6 text-green-500" />,
            title: "AI Integration Tests",
            description: "Automated integration test generation",
            content:
                "Generate integration test specifications from design documents and integration maps using AI.",
            buttonText: "Generate Tests",
            status: "development" as const,
            variant: "outline" as const,
        },
    ];

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "ready":
                return (
                    <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                        Ready
                    </Badge>
                );
            case "beta":
                return (
                    <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                        Beta
                    </Badge>
                );
            case "development":
                return (
                    <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                        In Development
                    </Badge>
                );
            default:
                return null;
        }
    };

    const ToolCard = ({ tool }: { tool: any }) => (
        <Card className="overflow-hidden border border-border/40 transition-all duration-300 hover:shadow-md hover:border-primary/20 h-full flex flex-col bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
            <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                    <div className="p-2 rounded-lg bg-background/80 border border-border/40">
                        {tool.icon}
                    </div>
                    {getStatusBadge(tool.status)}
                </div>
                <CardTitle className="mt-4 text-lg font-medium">{tool.title}</CardTitle>
                <CardDescription className="text-sm">{tool.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow py-2">
                <p className="text-muted-foreground text-sm">{tool.content}</p>
            </CardContent>
            <CardFooter className="pt-3 pb-3">
                <div className="flex items-center w-full gap-x-4">
                    <Link href={tool.href} className="w-full">
                        <Button
                            className="w-full gap-2 font-medium"
                            variant={
                                tool.variant
                                    ? tool.variant
                                    : tool.status === "ready"
                                    ? "default"
                                    : "secondary"
                            }
                            disabled={tool.status === "coming-soon"}
                        >
                            {tool.buttonText}
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </Link>
                    {/* link to dashboard */}
                    {tool.dashboardHref && (
                        <Link href={tool.dashboardHref} className="w-full">
                            <Button className="w-full gap-2 font-medium" variant="secondary">
                                Dashboard
                            </Button>
                        </Link>
                    )}
                </div>
            </CardFooter>
        </Card>
    );

    return (
        <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-slate-50 to-white dark:from-gray-900 dark:via-indigo-950/10 dark:to-gray-950">
            {/* Hero Section */}
            <section className="relative overflow-hidden py-12 md:py-20 border-b border-border/20">
                {/* Light mode grid pattern using inline styles */}
                <div
                    className="absolute inset-0 dark:hidden"
                    style={{
                        backgroundSize: "80px 80px",
                        backgroundImage: `
                            linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)
                        `,
                        opacity: 0.7,
                    }}
                ></div>

                {/* Dark mode grid pattern using the original class */}
                <div className="absolute inset-0 hidden dark:block bg-grid-pattern opacity-3"></div>

                {/* Gradient orbs */}
                <div className="absolute -top-40 right-0 w-96 h-96 bg-indigo-500 opacity-10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-20 left-0 w-80 h-80 bg-cyan-500 opacity-8 rounded-full blur-3xl"></div>
                <div className="absolute top-60 left-1/3 w-64 h-64 bg-violet-500 opacity-5 rounded-full blur-3xl"></div>

                <div className="container max-w-6xl mx-auto px-6 relative z-10">
                    <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
                        <div className="flex-1 text-left">
                            <h1 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-indigo-600 to-cyan-600 dark:from-indigo-400 dark:to-cyan-400 inline-block text-transparent bg-clip-text">
                                Earnest AI Tools
                            </h1>

                            <div className="inline-flex items-center ml-3 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500 mb-4">
                                <Sparkles className="h-4 w-4 mr-2" />
                                <span className="text-sm font-medium">Powered by AI</span>
                            </div>

                            <p className="text-base text-muted-foreground mb-5 max-w-xl leading-relaxed">
                                AI powered tools to automate and streamline your development and
                                project management workflows.
                            </p>

                            {/* Workspace selector with clear label */}
                            <div className="space-y-3">
                                <div className="flex items-center">
                                    <span className="text-sm font-medium text-muted-foreground mr-2">
                                        Select workspace:
                                    </span>
                                </div>
                                <div className="flex gap-3">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                size="lg"
                                                variant="outline"
                                                className="gap-2 px-6 border-2 w-full justify-between bg-white/80 dark:bg-gray-800/80 hover:bg-white/90 dark:hover:bg-gray-800/90"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1 rounded-md bg-indigo-500/10">
                                                        {currentWorkspace.icon}
                                                    </div>
                                                    <span>{currentWorkspace.label}</span>
                                                </div>
                                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent
                                            align="start"
                                            className="w-full min-w-[300px]"
                                        >
                                            <div className="py-2 px-3 text-xs font-medium text-muted-foreground border-b">
                                                Available Workspaces
                                            </div>
                                            {workspaces.map((workspace) => (
                                                <DropdownMenuItem
                                                    key={workspace.id}
                                                    className={`flex items-center gap-2 py-2 ${
                                                        activeTab === workspace.id
                                                            ? "bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 font-medium"
                                                            : ""
                                                    }`}
                                                    onClick={() => setActiveTab(workspace.id)}
                                                >
                                                    <div
                                                        className={`p-1 rounded-md ${
                                                            activeTab === workspace.id
                                                                ? "bg-indigo-500/15"
                                                                : "bg-gray-100 dark:bg-gray-800"
                                                        }`}
                                                    >
                                                        {workspace.icon}
                                                    </div>
                                                    <span>{workspace.label}</span>
                                                    {activeTab === workspace.id && (
                                                        <Badge className="ml-auto bg-indigo-500/10 text-indigo-500 border-indigo-500/20 text-xs font-normal py-0">
                                                            Active
                                                        </Badge>
                                                    )}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 hidden md:block">
                            <div className="relative h-60 w-full rounded-xl border border-border/30 bg-white/70 dark:bg-gray-900/60 p-6 backdrop-blur-sm overflow-hidden shadow-lg">
                                {/* Background elements */}
                                <div className="absolute opacity-20 w-24 h-24 bg-blue-500 rounded-full top-12 -right-8 blur-xl"></div>
                                <div className="absolute opacity-15 w-32 h-32 bg-green-500 rounded-full -bottom-10 left-20 blur-xl"></div>

                                {/* Selected floating elements */}
                                <div className="absolute top-6 left-6 w-60 p-4 rounded-lg bg-white/80 dark:bg-gray-900/80 border border-border/40 shadow-md backdrop-blur-sm">
                                    <div className="flex items-center mb-2">
                                        <div className="h-3 w-3 rounded-full bg-green-500 mr-2"></div>
                                        <span className="text-xs font-medium text-green-500">
                                            PR Created
                                        </span>
                                    </div>
                                    <div className="text-xs font-mono">
                                        <div className="text-muted-foreground">
                                            function{" "}
                                            <span className="text-blue-400">authenticateUser</span>
                                            () [
                                        </div>
                                        <div className="text-muted-foreground pl-2">
                                            return await{" "}
                                            <span className="text-green-400">oauth</span>.verify();
                                        </div>
                                        <div className="text-muted-foreground">]</div>
                                    </div>
                                </div>

                                <div className="absolute bottom-6 right-6 w-56 p-4 rounded-lg bg-white/80 dark:bg-gray-900/80 border border-border/40 shadow-md backdrop-blur-sm">
                                    <div className="flex items-center mb-2">
                                        <div className="h-3 w-3 rounded-full bg-amber-500 mr-2"></div>
                                        <span className="text-xs font-medium text-amber-500">
                                            PRD Generated
                                        </span>
                                    </div>
                                    <div className="text-xs">
                                        <div className="font-medium">Login System Requirements</div>
                                        <div className="mt-2 bg-muted/20 p-1.5 rounded text-muted-foreground">
                                            <span className="font-mono">## User Flow</span>
                                            <div className="pl-2 mt-1">1. Social login options</div>
                                            <div className="pl-2">2. Email verification</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Main Content - No padding between hero and tools */}
            <section className="py-6 md:py-8">
                <div className="container max-w-6xl mx-auto px-6">
                    <div>
                        <Tabs value={activeTab} className="w-full" onValueChange={setActiveTab}>
                            <TabsContent value="developer" className="space-y-6">
                                <div className="text-center max-w-2xl mx-auto mb-6">
                                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 mb-3">
                                        <Code className="h-4 w-4 mr-2" />
                                        <span className="text-sm font-medium">
                                            Developer Workspace
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-12">
                                    {devTools.map((tool, index) => (
                                        <ToolCard key={index} tool={tool} />
                                    ))}
                                </div>
                            </TabsContent>

                            <TabsContent value="management" className="space-y-6">
                                <div className="text-center max-w-2xl mx-auto mb-6">
                                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 mb-3">
                                        <Ticket className="h-4 w-4 mr-2" />
                                        <span className="text-sm font-medium">PM Workspace</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-12">
                                    {pmTools.map((tool, index) => (
                                        <ToolCard key={index} tool={tool} />
                                    ))}
                                </div>
                            </TabsContent>

                            <TabsContent value="qe" className="space-y-6">
                                <div className="text-center max-w-2xl mx-auto mb-6">
                                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-500/10 text-green-500 mb-3">
                                        <Code className="h-4 w-4 mr-2" />
                                        <span className="text-sm font-medium">QE Workspace</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-12">
                                    {qeTools.map((tool, index) => (
                                        <ToolCard key={index} tool={tool} />
                                    ))}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-border/30 py-8 mt-8 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
                <div className="container max-w-6xl mx-auto px-6">
                    <div className="text-center text-sm text-muted-foreground">
                        © {new Date().getFullYear()} Earnest. Internal use only.
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default HomePage;
