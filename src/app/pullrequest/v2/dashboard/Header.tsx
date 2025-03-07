import React from "react";
import { Sparkles } from "lucide-react";

export function DashboardHeader() {
    return (
        <div className="text-center mb-12 animate-fade-in">
            <div className="flex items-center justify-center gap-3 mb-4">
                <Sparkles className="w-6 h-6 text-primary" />
                <h1 className="text-3xl font-light">Earnest AI Code Generator</h1>
            </div>
            <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
                Dashboard metrics for code generation and pull requests with AI assistance.
            </p>
        </div>
    );
}

// Simple fade-in animation without motion library
const styles = `
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fadeIn 0.5s ease-out forwards;
}
`;

// Add the styles to the component
DashboardHeader.styles = styles;
