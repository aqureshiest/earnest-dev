import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
} from "@/components/ui/card";
import { ArrowRight, Code, Coffee, Ticket, GitFork } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const HomePage: React.FC = () => {
    return (
        <div className="container mx-auto px-4 py-16">
            <section className="text-center mb-16">
                <h1 className="text-4xl font-bold mb-4">Earnest AI Dev</h1>
                <p className="text-xl text-muted-foreground mb-8">
                    Empowering Earnest developers with AI-powered tools
                </p>
            </section>

            <section className="flex justify-center">
                <div className="grid md:grid-cols-2 gap-8 max-w-6xl">
                    <Link href="/pullrequest" className="group">
                        <Card className="w-full h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                            <CardHeader>
                                <CardTitle className="text-2xl flex items-center gap-2">
                                    <Code className="h-6 w-6 transition-transform duration-300 group-hover:scale-110" />
                                    AI Pull Requests
                                </CardTitle>
                                <CardDescription>Let AI create PRs for you</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p>
                                    Let this tool write the code for you. It connects with our
                                    GitHub repos to automagically generate code and create pull
                                    requests.
                                </p>
                            </CardContent>
                            <CardFooter>
                                <Button className="group-hover:bg-primary/90">
                                    Create a Pull Request
                                    <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                                </Button>
                            </CardFooter>
                        </Card>
                    </Link>

                    <Link href="/jiratickets" className="group">
                        <Card className="w-full h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                            <CardHeader>
                                <CardTitle className="text-2xl flex items-center gap-2">
                                    <Ticket className="h-6 w-6 transition-transform duration-300 group-hover:scale-110" />
                                    AI Jira Tickets
                                    <Badge variant="secondary" className="ml-2 text-blue-700">
                                        Not ready yet
                                    </Badge>
                                </CardTitle>
                                <CardDescription>
                                    Let AI do the project planning for you
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p>
                                    Give this tool a technical design document and it will create
                                    Jira epics and tickets for you.
                                </p>
                            </CardContent>
                            <CardFooter>
                                <Button className="group-hover:bg-primary/90">
                                    Generate Jira Tickets
                                    <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                                </Button>
                            </CardFooter>
                        </Card>
                    </Link>

                    <Link href="/code-analysis" className="group">
                        <Card className="w-full h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                            <CardHeader>
                                <CardTitle className="text-2xl flex items-center gap-2">
                                    <GitFork className="h-6 w-6 transition-transform duration-300 group-hover:scale-110" />
                                    Design Patterns Audit
                                    <Badge variant="secondary" className="ml-2 text-blue-700">
                                        Beta
                                    </Badge>
                                </CardTitle>
                                <CardDescription>
                                    AI-powered design pattern analysis
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p>
                                    Analyze your repository to identify opportunities for
                                    implementing better design patterns and architectural
                                    improvements.
                                </p>
                            </CardContent>
                            <CardFooter>
                                <Button className="group-hover:bg-primary/90">
                                    Audit Repository
                                    <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                                </Button>
                            </CardFooter>
                        </Card>
                    </Link>
                </div>
            </section>
        </div>
    );
};

export default HomePage;
