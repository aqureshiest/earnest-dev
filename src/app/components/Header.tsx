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
                        <div className="size-8 rounded-full bg-gradient-to-r from-indigo-600 to-cyan-600 p-1.5">
                            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path
                                    fillRule="evenodd"
                                    clipRule="evenodd"
                                    d="M24 0.757355L47.2426 24L24 47.2426L0.757355 24L24 0.757355ZM21 35.7574V12.2426L9.24264 24L21 35.7574Z"
                                    fill="white"
                                    className="opacity-90"
                                />
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
