"use client";

import dynamic from "next/dynamic";
import { ReactFlowProvider } from "reactflow";
import "reactflow/dist/style.css";

// Dynamically import the WorkflowCanvas component
const WorkflowCanvas = dynamic(() => import("@/app/components/workflow/WorkflowCanvas"), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-screen">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
    ),
});

export default function WorkflowClient() {
    return (
        <ReactFlowProvider>
            <WorkflowCanvas />
        </ReactFlowProvider>
    );
}
