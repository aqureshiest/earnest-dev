"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Code, Ticket, GitFork, FileText } from "lucide-react";
import VersionedToolCard from "./components/VersionedToolCard";

const HomePage: React.FC = () => {
    const tools = [
        {
            href: "/pullrequest",
            icon: Code,
            title: "AI Pull Requests",
            description: "Let AI create PRs for you",
            content:
                "Automate your workflow with AI-powered code generation and pull request creation, seamlessly integrated with your GitHub repositories.",
            buttonText: "Create Pull Request",
            status: "ready" as const,
            versions: [
                { version: "2", isDefault: true },
                {
                    version: "1",
                },
            ],
        },
        {
            href: "/jiratickets",
            icon: Ticket,
            title: "AI Jira Tickets",
            description: "Automated project planning assistant",
            content:
                "Transform technical design documents into well-structured Jira epics and tickets with intelligent task breakdown and estimation.",
            buttonText: "Generate Tickets",
            status: "development" as const,
        },
        {
            href: "/code-analysis",
            icon: GitFork,
            title: "Design Patterns Audit",
            description: "AI-powered design pattern analysis",
            content:
                "Enhance your codebase quality with automated design pattern analysis and receive intelligent architectural improvement suggestions.",
            buttonText: "Audit Repository",
            status: "development" as const,
        },
        {
            href: "/prd",
            icon: FileText,
            title: "AI PRD Generator",
            description: "Convert designs to PRDs",
            content:
                "Transform Figma designs and PM inputs into comprehensive product requirement documents with automated spec generation.",
            buttonText: "Generate PRD",
            status: "beta" as const,
        },
    ];

    return (
        <div className="min-h-screen bg-background max-w-7xl mx-auto">
            <section className="py-12 bg-gradient-to-b from-background to-muted/30 border-b border-border/40">
                <div className="container mx-auto px-4 text-center">
                    <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-emerald-600 dark:from-blue-400 dark:to-emerald-400 inline-block text-transparent bg-clip-text">
                        Earnest AI Dev
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Empowering developers with intelligent automation tools
                    </p>
                </div>
            </section>

            <div className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tools.map((tool, index) => (
                        <VersionedToolCard key={index} {...tool} />
                    ))}
                </div>

                <div className="mt-8 flex justify-center">
                    <Link href="/create-extension">
                        <Button variant="outline" className="gap-2 hover:bg-primary/10">
                            Create Extension
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default HomePage;
