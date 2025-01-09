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
import { cn } from "@/lib/utils";
import { ModeToggle } from "./ModeToggle";

const Header: React.FC = () => {
    return (
        <header className="bg-background border-b">
            <div className="container mx-auto px-4">
                <div className="flex h-16 items-center justify-between">
                    <div className="flex items-center gap-x-2">
                        <div className="size-8 rounded-full bg-gradient-to-r from-blue-600 to-emerald-600 p-1.5">
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
                                className="bg-gradient-to-r from-blue-600 to-emerald-600 inline-block text-transparent bg-clip-text hover:opacity-80 transition-opacity"
                            >
                                Earnest AI Dev
                            </Link>
                        </h1>
                    </div>

                    <nav className="hidden md:flex items-center space-x-4">
                        {/* <NavLink href="/dashboard">Dashboard</NavLink>
                        <NavLink href="/teams">Teams</NavLink>
                        <NavLink href="/repositories">Repositories</NavLink> */}
                        <ModeToggle />
                    </nav>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild className="md:hidden">
                            <Button variant="ghost" size="icon">
                                <Menu className="h-5 w-5" />
                                <span className="sr-only">Toggle menu</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {/* <DropdownMenuItem asChild>
                                <Link href="/dashboard">Dashboard</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href="/teams">Teams</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href="/repositories">Repositories</Link>
                            </DropdownMenuItem> */}
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

const NavLink: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => {
    return (
        <Link
            href={href}
            className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                "text-muted-foreground"
            )}
        >
            {children}
        </Link>
    );
};

export default Header;
