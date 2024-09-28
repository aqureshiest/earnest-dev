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
import { ArrowRight, Code, Coffee, Ticket } from "lucide-react";

const HomePage: React.FC = () => {
    return (
        <div className="container mx-auto px-4 py-16">
            <section className="text-center mb-16">
                <h1 className="text-4xl font-bold mb-4">Earnest AI Dev</h1>
                <p className="text-xl text-muted-foreground mb-8">
                    Empowering Earnest developers with AI-powered tools
                </p>
            </section>

            <section className="grid md:grid-cols-2 gap-8">
                <Card className="max-w-2xl w-full">
                    <CardHeader>
                        <CardTitle className="text-2xl flex items-center gap-2">
                            <Code className="h-6 w-6" />
                            AI Pull Requests
                        </CardTitle>
                        <CardDescription>Let AI create PRs for you</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p>
                            Let this tool write the code for you. It connects with our GitHub repos
                            to automagically generate code and create pull requests.
                        </p>
                    </CardContent>
                    <CardFooter>
                        <Button asChild>
                            <Link href="/pullrequest">
                                Create a Pull Request <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>

                <Card className="max-w-2xl w-full">
                    <CardHeader>
                        <CardTitle className="text-2xl flex items-center gap-2">
                            <Ticket className="h-6 w-6" />
                            AI Jira Tickets
                        </CardTitle>
                        <CardDescription>Let AI do the project planning for you</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p>
                            Give this tool a technical design document and it will create Jira epics
                            and tickets for you.
                        </p>
                    </CardContent>
                    <CardFooter>
                        <Button asChild>
                            <Link href="/jiratickets">
                                Geneate Jira Tickets <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
            </section>
        </div>
    );
};

export default HomePage;
