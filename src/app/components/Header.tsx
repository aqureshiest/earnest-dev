import React from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu } from "lucide-react";
// import { ModeToggle } from "@/components/mode-toggle";

const Header: React.FC = () => {
    return (
        <header className="bg-teal-700 dark:bg-teal-900 text-white py-4 shadow-md">
            <div className="container mx-auto flex items-center justify-between">
                <div className="flex items-center gap-x-2">
                    <div className="size-6">
                        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                                fillRule="evenodd"
                                clipRule="evenodd"
                                d="M24 0.757355L47.2426 24L24 47.2426L0.757355 24L24 0.757355ZM21 35.7574V12.2426L9.24264 24L21 35.7574Z"
                                fill="currentColor"
                            />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold">
                        <a href="/" className="hover:text-teal-200 transition-colors">
                            Earnest AI Dev
                        </a>
                    </h1>
                </div>

                <nav className="hidden md:flex items-center space-x-4">
                    <a href="/dashboard" className="hover:text-teal-200 transition-colors">
                        Dashboard
                    </a>
                    <a href="/teams" className="hover:text-teal-200 transition-colors">
                        Teams
                    </a>
                    <a href="/repositories" className="hover:text-teal-200 transition-colors">
                        Repositories
                    </a>
                    {/* <ModeToggle /> */}
                </nav>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild className="md:hidden">
                        <Button variant="ghost" size="icon">
                            <Menu className="h-5 w-5" />
                            <span className="sr-only">Toggle menu</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                            <a href="/dashboard">Dashboard</a>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <a href="/teams">Teams</a>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <a href="/repositories">Repositories</a>
                        </DropdownMenuItem>
                        {/* <DropdownMenuItem>
                            <ModeToggle />
                        </DropdownMenuItem> */}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
};

export default Header;
