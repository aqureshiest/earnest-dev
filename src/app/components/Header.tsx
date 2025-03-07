import Image from "next/image";
import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu } from "lucide-react";
import { ModeToggle } from "./ModeToggle";

const Header: React.FC = () => {
    return (
        <header className="bg-background/80 backdrop-blur-sm border-b border-border/30">
            <div className="container max-w-6xl mx-auto px-6">
                <div className="flex h-16 items-center justify-between">
                    <div className="flex items-center gap-x-2">
                        <div className="size-8 rounded-full bg-gradient-to-r from-indigo-600 to-cyan-600 p-1">
                            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path
                                    fillRule="evenodd"
                                    clipRule="evenodd"
                                    d="M24 4L41.5885 14V34L24 44L6.41154 34V14L24 4Z"
                                    stroke="white"
                                    strokeWidth="2"
                                    className="opacity-90"
                                />

                                <path
                                    d="M24 12L34 18V30L24 36L14 30V18L24 12Z"
                                    stroke="white"
                                    strokeWidth="2"
                                    className="opacity-90"
                                />

                                <line
                                    x1="24"
                                    y1="4"
                                    x2="24"
                                    y2="12"
                                    stroke="white"
                                    strokeWidth="2"
                                    className="opacity-90"
                                />
                                <line
                                    x1="24"
                                    y1="36"
                                    x2="24"
                                    y2="44"
                                    stroke="white"
                                    strokeWidth="2"
                                    className="opacity-90"
                                />
                                <line
                                    x1="41.5885"
                                    y1="14"
                                    x2="34"
                                    y2="18"
                                    stroke="white"
                                    strokeWidth="2"
                                    className="opacity-90"
                                />
                                <line
                                    x1="41.5885"
                                    y1="34"
                                    x2="34"
                                    y2="30"
                                    stroke="white"
                                    strokeWidth="2"
                                    className="opacity-90"
                                />
                                <line
                                    x1="6.41154"
                                    y1="14"
                                    x2="14"
                                    y2="18"
                                    stroke="white"
                                    strokeWidth="2"
                                    className="opacity-90"
                                />
                                <line
                                    x1="6.41154"
                                    y1="34"
                                    x2="14"
                                    y2="30"
                                    stroke="white"
                                    strokeWidth="2"
                                    className="opacity-90"
                                />

                                <circle cx="24" cy="24" r="4" fill="white" className="opacity-90" />

                                <circle cx="24" cy="12" r="2" fill="white" className="opacity-90" />
                                <circle cx="24" cy="36" r="2" fill="white" className="opacity-90" />
                                <circle cx="34" cy="18" r="2" fill="white" className="opacity-90" />
                                <circle cx="34" cy="30" r="2" fill="white" className="opacity-90" />
                                <circle cx="14" cy="18" r="2" fill="white" className="opacity-90" />
                                <circle cx="14" cy="30" r="2" fill="white" className="opacity-90" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold">
                            <Link
                                href="/"
                                className="bg-gradient-to-r from-indigo-600 to-cyan-600 dark:from-indigo-400 dark:to-cyan-400 inline-block text-transparent bg-clip-text hover:opacity-80 transition-opacity"
                            >
                                Earnest AI Tools
                            </Link>
                        </h1>
                    </div>

                    <nav className="hidden md:flex items-center space-x-4">
                        <ModeToggle />
                    </nav>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild className="md:hidden">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-indigo-600 dark:text-indigo-400"
                            >
                                <Menu className="h-5 w-5" />
                                <span className="sr-only">Toggle menu</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                                <ModeToggle />
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    );
};

export default Header;
