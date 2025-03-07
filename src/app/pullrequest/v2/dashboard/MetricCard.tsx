import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MetricCardProps {
    title: string;
    value: number | string;
    description?: string;
    loading?: boolean;
    trend?: "up" | "down" | "neutral";
    status?: "positive" | "warning" | "negative" | "info";
    icon?: React.ReactNode;
}

export function MetricCard({
    title,
    value,
    description,
    loading = false,
    trend,
    status = "info",
    icon,
}: MetricCardProps) {
    // Determine color based on status
    const getStatusColor = () => {
        switch (status) {
            case "positive":
                return "text-green-600 dark:text-green-500";
            case "warning":
                return "text-amber-600 dark:text-amber-500";
            case "negative":
                return "text-red-600 dark:text-red-500";
            case "info":
            default:
                return "text-blue-600 dark:text-blue-500";
        }
    };

    // Determine color for percentage value (like success rate)
    const getValueColor = () => {
        // Check if value is a percentage
        if (typeof value === "string" && value.includes("%")) {
            const numValue = parseFloat(value);
            if (numValue >= 90) return "text-green-600 dark:text-green-500";
            if (numValue >= 70) return "text-amber-600 dark:text-amber-500";
            return "text-red-600 dark:text-red-500";
        }
        return "";
    };

    return (
        <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {icon && <div className={getStatusColor()}>{icon}</div>}
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="h-9 w-24 animate-pulse rounded-md bg-gray-200 dark:bg-gray-700" />
                ) : (
                    <div className={`text-2xl font-bold ${getValueColor()}`}>
                        {value}
                        {trend && (
                            <span className="ml-2 text-sm">
                                {trend === "up" && "↑"}
                                {trend === "down" && "↓"}
                                {trend === "neutral" && "→"}
                            </span>
                        )}
                    </div>
                )}
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </CardContent>
        </Card>
    );
}
