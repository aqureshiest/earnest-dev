import { type Metadata } from "next";

export const metadata: Metadata = {
    title: "Earnest AI Code Generator Dashboard",
    description: "Dashboard showing metrics for the Earnest AI code generator",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 py-12 px-6 relative">
            {/* Light mode grid pattern for entire page */}
            <div
                className="absolute inset-0 dark:hidden"
                style={{
                    backgroundSize: "80px 80px",
                    backgroundImage: `
                linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)
            `,
                    opacity: 0.7,
                }}
            ></div>

            {/* Dark mode grid pattern for entire page */}
            <div className="absolute inset-0 hidden dark:block bg-grid-pattern opacity-3"></div>

            {/* Content container with z-index to appear above the grid */}
            <div className="max-w-6xl mx-auto space-y-12 relative z-10">{children}</div>
        </div>
    );
}
