import { Metadata } from "next";

export const metadata: Metadata = {
    title: "AI Workflows",
    description: "Create and manage AI workflows",
};

export default function WorkflowLayout({ children }: { children: React.ReactNode }) {
    return <div className="h-screen bg-background">{children}</div>;
}
