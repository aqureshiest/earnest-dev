import React from "react";

interface SectionHeaderProps {
    title: string;
    icon?: React.ReactNode;
}

export function SectionHeader({ title, icon }: SectionHeaderProps) {
    return (
        <div className="flex items-center space-x-2 mb-4">
            {icon && <div className="text-primary">{icon}</div>}
            <h2 className="text-xl font-medium text-slate-800 dark:text-slate-200">{title}</h2>
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700 ml-2"></div>
        </div>
    );
}
