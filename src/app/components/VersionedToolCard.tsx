import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
} from "@/components/ui/card";
import { ArrowRight, ChevronDown, LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Version interface
interface ToolVersion {
    version: string;
    isDefault?: boolean;
    releaseDate?: string;
}

// Extended ToolCardProps with versions
interface ToolCardProps {
    href: string;
    icon: LucideIcon;
    title: string;
    description: string;
    content: string;
    buttonText: string;
    status: "ready" | "beta" | "development";
    versions?: ToolVersion[];
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

const VersionedToolCard: React.FC<ToolCardProps> = ({
    href,
    icon: Icon,
    title,
    description,
    content,
    buttonText,
    status,
    versions,
}) => {
    const router = useRouter();
    const badgeProps = getStatusBadgeProps(status);

    // If versions exist, find the default one or use the first one
    const defaultVersion = versions?.find((v) => v.isDefault)?.version || versions?.[0]?.version;

    // Initialize selectedVersion with defaultVersion
    const [selectedVersion, setSelectedVersion] = useState<string | null>(defaultVersion || null);

    // Determine if we should show version selector (only if there are multiple versions)
    const showVersionSelector = versions && versions.length > 1;

    // Handle navigation when the button is clicked
    const handleNavigation = () => {
        if (!selectedVersion || selectedVersion === "1") {
            router.push(href);
        } else {
            router.push(`${href}/v${selectedVersion}`);
        }
    };

    return (
        <Card className="h-full overflow-hidden transition-all duration-300 hover:shadow-lg border border-border/50 hover:border-border max-w-sm">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 dark:bg-primary/5">
                            <Icon className="h-5 w-5 text-primary" />
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

                {/* Version display for single version */}
                {!showVersionSelector && versions && versions.length === 1 && (
                    <div className="mt-4">
                        <span className="text-xs text-muted-foreground bg-secondary/20 px-2 py-1 rounded">
                            v{versions[0].version}
                        </span>
                    </div>
                )}
            </CardContent>
            <CardFooter className="pt-4">
                <div className="w-full flex justify-between items-center gap-3">
                    {/* Version selector dropdown - only shown when multiple versions exist */}
                    {showVersionSelector && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="text-xs h-8">
                                    v{selectedVersion || "Current"}
                                    <ChevronDown className="ml-1 h-3 w-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                {versions?.map((ver) => (
                                    <DropdownMenuItem
                                        key={ver.version}
                                        onClick={() => setSelectedVersion(ver.version)}
                                        className="flex items-center gap-2"
                                    >
                                        v{ver.version}
                                        {ver.isDefault && (
                                            <Badge
                                                variant="secondary"
                                                className="ml-1 text-xs py-0"
                                            >
                                                Default
                                            </Badge>
                                        )}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}

                    {/* Action button using onClick instead of Link */}
                    <Button
                        className={`${
                            showVersionSelector ? "flex-grow" : "w-full"
                        } justify-center hover:bg-primary/90 transition-colors`}
                        onClick={handleNavigation}
                    >
                        {buttonText}
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
};

export default VersionedToolCard;
