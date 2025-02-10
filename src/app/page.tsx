import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
} from "@/components/ui/card";
import { ArrowRight, Code, Ticket, GitFork, FileText, LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ToolCardProps {
    href: string;
    icon: LucideIcon;
    title: string;
    description: string;
    content: string;
    buttonText: string;
    status: "ready" | "beta" | "development";
}

const getStatusBadgeProps = (status: ToolCardProps["status"]) => {
    switch (status) {
        case "ready":
            return {
                text: "Ready",
                color: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
            };
        case "beta":
            return {
                text: "Beta",
                color: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
            };
        case "development":
            return {
                text: "Dev",
                color: "bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400",
            };
    }
};

const ToolCard: React.FC<ToolCardProps> = ({
    href,
    icon: Icon,
    title,
    description,
    content,
    buttonText,
    status,
}) => {
    const badgeProps = getStatusBadgeProps(status);

    return (
        <Link href={href} className="group">
            <Card className="relative h-full overflow-hidden transition-all duration-300 hover:shadow-lg border border-border/50 hover:border-border max-w-sm">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-background/10 to-background/5 transition-opacity duration-300" />
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 dark:bg-primary/5">
                                <Icon className="h-5 w-5 text-primary transition-transform duration-300 group-hover:scale-110" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">{title}</CardTitle>
                                <CardDescription className="mt-1">{description}</CardDescription>
                            </div>
                        </div>
                        <Badge variant="secondary" className={badgeProps.color}>
                            {badgeProps.text}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">{content}</p>
                </CardContent>
                <CardFooter className="pt-6">
                    <Button className="w-full justify-center group-hover:bg-primary/90 transition-colors">
                        {buttonText}
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </Button>
                </CardFooter>
            </Card>
        </Link>
    );
};

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
        },
        {
            href: "/jiratickets",
            icon: Ticket,
            title: "AI Jira Tickets",
            description: "Automated project planning assistant",
            content:
                "Transform technical design documents into well-structured Jira epics and tickets with intelligent task breakdown and estimation.",
            buttonText: "Generate Tickets",
            status: "beta" as const,
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
            href: "/prd/v2",
            icon: FileText,
            title: "AI PRD Generator",
            description: "Convert designs to PRDs",
            content:
                "Transform Figma designs and PM inputs into comprehensive product requirement documents with automated spec generation.",
            buttonText: "Generate PRD",
            status: "development" as const,
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
                        <ToolCard key={index} {...tool} />
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
