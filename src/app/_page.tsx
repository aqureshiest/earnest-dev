// app/github-metrics/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import Dashboard from "./Dashboard";

export default function GitHubMetricsPage() {
    const [metricsData, setMetricsData] = useState<MetricsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchMetrics() {
            try {
                const response = await fetch("/api/github-metrics");
                if (!response.ok) {
                    throw new Error("Failed to fetch metrics");
                }
                const data = await response.json();
                setMetricsData(data);
            } catch (err) {
                setError("An error occurred while fetching metrics");
                console.error(err);
            } finally {
                setLoading(false);
            }
        }

        fetchMetrics();
    }, []);

    if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
    if (error)
        return (
            <div className="flex justify-center items-center h-screen text-red-500">
                Error: {error}
            </div>
        );
    if (!metricsData)
        return <div className="flex justify-center items-center h-screen">No data available</div>;

    return <Dashboard metricsData={metricsData} />;
}
