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
import { ArrowRight, Code, Coffee } from "lucide-react";

const HomePage: React.FC = () => {
    return (
        <div className="container mx-auto px-4 py-16">
            <section className="text-center mb-16">
                <h1 className="text-4xl font-bold mb-4">Earnest AI Dev</h1>
                <p className="text-xl text-muted-foreground mb-8">
                    Earnest developer's growing collection of AI-powered tools.
                </p>
                {/* <div className="flex justify-center">
                    <Button asChild size="lg">
                        <Link href="/dashboard">
                            Take a look <Coffee className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </div> */}
            </section>

            <section className="flex flex-col items-center">
                <Card className="max-w-2xl w-full">
                    <CardHeader>
                        <CardTitle className="text-2xl flex items-center gap-2">
                            <Code className="h-6 w-6" />
                            AI Pull Requests
                        </CardTitle>
                        <CardDescription>
                            Let AI do the upfront work for your pull requests
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p>
                            This tool connects with our GitHub repos to automagically generate code
                            and create pull requests. Think of it as your AI pair programmer.
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

                {/* <div className="mt-12 text-center max-w-xl">
                    <h2 className="text-2xl font-semibold mb-4">What's cooking?</h2>
                    <p className="text-muted-foreground">
                        We're brewing up some more dev tools to add to our toolkit. Got any cool
                        ideas? Drop them in our #dev-tools Slack channel. Let's make our dev lives
                        even better together!
                    </p>
                </div> */}
            </section>
        </div>
    );
};

export default HomePage;
