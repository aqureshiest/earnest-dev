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
        <Card className="w-full h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1 bg-card">
            <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                    <Icon className="h-6 w-6 transition-transform duration-300 group-hover:scale-110" />
                    {title}
                    {badge && (
                        <Badge variant="secondary" className={`ml-2 ${badge.color}`}>
                            {badge.text}
                        </Badge>
                    )}
                </CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-card-foreground">{content}</p>
            </CardContent>
            <CardFooter>
                <Button className="group-hover:bg-primary/90">
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
    <div className={`py-12 ${backgroundColor}`}>
        <div className="container mx-auto px-4">
            <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                    <h2 className={`text-2xl font-bold ${accentColor}`}>{title}</h2>
                    {showCreateButton && (
                        <Link href="/create-extension">
                            <Button className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600">
                                Create Extension
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                    )}
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tools}
                {tools.length === 0 && (
                    <Card className="w-full h-full bg-muted border-dashed">
                        <CardHeader>
                            <CardTitle className="text-xl text-muted-foreground">
                                No extensions yet
                            </CardTitle>
                            <CardDescription>
                                Create your first extension using AI PR tool
                            </CardDescription>
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
            title="AI Pull Requests 🤖"
            description="Let AI create PRs for you"
            content="Let this tool write the code for you. It connects with our GitHub repos to automagically generate code and create pull requests."
            buttonText="Create a Pull Request"
            badge={{
                text: "Ready",
                color: "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-400",
            }}
        />,
    ];

    const inProgressTools: React.ReactNode[] = [
        <ToolCard
            key="code-analysis"
            href="/code-analysis"
            icon={GitFork}
            title="Design Patterns Audit 🧐"
            description="AI-powered design pattern analysis"
            content="Analyze your repository to identify opportunities for implementing better design patterns and architectural improvements."
            buttonText="Audit Repository"
            badge={{
                text: "Beta",
                color: "bg-blue-500/15 text-blue-700 dark:bg-blue-500/25 dark:text-blue-400",
            }}
        />,
        <ToolCard
            key="jiratickets"
            href="/jiratickets"
            icon={Ticket}
            title="AI Jira Tickets 🎫"
            description="Let AI do the project planning for you"
            content="Give this tool a technical design document and it will create Jira epics and tickets for you."
            buttonText="Generate Jira Tickets"
            badge={{
                text: "Beta",
                color: "bg-blue-500/15 text-blue-700 dark:bg-blue-500/25 dark:text-blue-400",
            }}
        />,
    ];

    const extensionTools: React.ReactNode[] = [];

    return (
        <div className="min-h-screen bg-background">
            <section className="text-center py-8 bg-background border-b border-border">
                <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-emerald-600 dark:from-blue-400 dark:to-emerald-400 inline-block text-transparent bg-clip-text">
                    Earnest AI Dev
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    Empowering Earnest developers with AI-powered tools
                </p>
            </section>

            <CategorySection
                title="Ready to Use 🤞"
                tools={readyTools}
                backgroundColor="bg-background"
                accentColor="text-emerald-600 dark:text-emerald-400"
            />

            <CategorySection
                title="In Development 🚧"
                tools={inProgressTools}
                backgroundColor="bg-muted"
                accentColor="text-blue-600 dark:text-blue-400"
            />

            <CategorySection
                title="Extensions 🧩"
                tools={extensionTools}
                backgroundColor="bg-background"
                accentColor="text-purple-600 dark:text-purple-400"
                showCreateButton={true}
            />
        </div>
    );
};

export default HomePage;
