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
import { ArrowRight, Code, Coffee, Ticket, GitFork, LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BadgeProps {
    text: string;
    color: string;
}

interface ToolCardProps {
    href: string;
    icon: LucideIcon;
    title: string;
    description: string;
    content: string;
    buttonText: string;
    badge?: BadgeProps;
}

const ToolCard: React.FC<ToolCardProps> = ({
    href,
    icon: Icon,
    title,
    description,
    content,
    buttonText,
    badge,
}) => (
    <Link href={href} className="group">
        <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-lg border border-border/50 hover:border-border">
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
                    {badge && (
                        <Badge variant="secondary" className={`${badge.color}`}>
                            {badge.text}
                        </Badge>
                    )}
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

interface CategorySectionProps {
    title: string;
    tools: React.ReactNode[];
    backgroundColor?: string;
    accentColor?: string;
    showCreateButton?: boolean;
}

const CategorySection: React.FC<CategorySectionProps> = ({
    title,
    tools,
    backgroundColor,
    accentColor,
    showCreateButton,
}) => (
    <div className={`py-8 ${backgroundColor}`}>
        <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <h2 className={`text-xl font-semibold ${accentColor}`}>{title}</h2>
                </div>
                {showCreateButton && (
                    <Link href="/create-extension">
                        <Button
                            variant="outline"
                            className="gap-2 hover:bg-purple-500/10 hover:text-purple-500 border-purple-500/20"
                        >
                            Create Extension
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </Link>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tools}
                {tools.length === 0 && (
                    <Card className="w-full h-full bg-muted/50 border-dashed">
                        <CardHeader className="text-center py-12">
                            <CardTitle className="text-lg text-muted-foreground">
                                No extensions available
                            </CardTitle>
                            <CardDescription className="mt-2">
                                Get started by creating your first extension
                            </CardDescription>
                            <Link href="/create-extension" className="mt-4 inline-block">
                                <Button variant="outline" size="sm">
                                    Create Extension
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                        </CardHeader>
                    </Card>
                )}
            </div>
        </div>
    </div>
);

const HomePage: React.FC = () => {
    const readyTools: React.ReactNode[] = [
        <ToolCard
            key="pullrequest"
            href="/pullrequest"
            icon={Code}
            title="AI Pull Requests"
            description="Let AI create PRs for you"
            content="Automate your workflow with AI-powered code generation and pull request creation, seamlessly integrated with your GitHub repositories."
            buttonText="Create Pull Request"
            badge={{
                text: "Ready",
                color: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
            }}
        />,
    ];

    const inProgressTools: React.ReactNode[] = [
        <ToolCard
            key="jiratickets"
            href="/jiratickets"
            icon={Ticket}
            title="AI Jira Tickets"
            description="Automated project planning assistant"
            content="Transform technical design documents into well-structured Jira epics and tickets with intelligent task breakdown and estimation."
            buttonText="Generate Tickets"
            badge={{
                text: "Beta",
                color: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
            }}
        />,
        <ToolCard
            key="code-analysis"
            href="/code-analysis"
            icon={GitFork}
            title="Design Patterns Audit"
            description="AI-powered design pattern analysis"
            content="Enhance your codebase quality with automated design pattern analysis and receive intelligent architectural improvement suggestions."
            buttonText="Audit Repository"
            badge={{
                text: "Beta",
                color: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
            }}
        />,
    ];

    const extensionTools: React.ReactNode[] = [];

    return (
        <div className="min-h-screen bg-background">
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

            <div className="space-y-2">
                <CategorySection
                    title="Ready To Use"
                    tools={readyTools}
                    backgroundColor="bg-background"
                    accentColor="text-emerald-600 dark:text-emerald-400"
                />

                <CategorySection
                    title="Under Development"
                    tools={inProgressTools}
                    backgroundColor="bg-muted/30"
                    accentColor="text-blue-600 dark:text-blue-400"
                />

                <CategorySection
                    title="Community Extensions"
                    tools={extensionTools}
                    backgroundColor="bg-background"
                    accentColor="text-purple-600 dark:text-purple-400"
                    showCreateButton={true}
                />
            </div>
        </div>
    );
};

export default HomePage;
