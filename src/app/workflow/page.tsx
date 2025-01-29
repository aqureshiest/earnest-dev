import { Metadata } from "next";

export const metadata: Metadata = {
    title: "AI Workflows",
    description: "Create and manage AI workflows",
};

import WorkflowClient from "./WorkflowClient";

export default function WorkflowsPage() {
    return (
        <div className="h-screen">
            <WorkflowClient />
        </div>
    );
}
