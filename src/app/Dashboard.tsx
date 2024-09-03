import React, { useState } from "react";
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell,
} from "recharts";

interface DashboardProps {
    metricsData: MetricsData;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

const Dashboard: React.FC<DashboardProps> = ({ metricsData }) => {
    const [selectedDeveloper, setSelectedDeveloper] = useState<string | null>(null);

    const filteredCommitFrequency = selectedDeveloper
        ? metricsData.commitFrequency.filter((item) => item.developer === selectedDeveloper)
        : metricsData.commitFrequency;

    const totalCommits = filteredCommitFrequency.reduce((sum, item) => sum + item.frequency, 0);
    const totalPRs = metricsData.prMetrics.reduce((sum, item) => sum + item.frequency, 0);
    const averagePRSize =
        metricsData.prMetrics.reduce((sum, item) => sum + item.averageSize, 0) /
        metricsData.prMetrics.length;

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-4xl font-bold mb-8 text-gray-800">Productivity Dashboard</h1>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {[
                    { title: "Total Commits", value: totalCommits },
                    { title: "Total Pull Requests", value: totalPRs },
                    { title: "Average PR Size", value: `${averagePRSize.toFixed(0)} lines` },
                ].map((item, index) => (
                    <div
                        key={index}
                        className="bg-white rounded-lg shadow-md p-6 transition-all duration-300 hover:shadow-lg"
                    >
                        <h2 className="text-xl font-semibold mb-2 text-gray-700">{item.title}</h2>
                        <p className="text-4xl font-bold text-indigo-600">{item.value}</p>
                    </div>
                ))}
            </div>

            {/* Developer Selector */}
            <div className="mb-8">
                <select
                    className="w-full md:w-64 p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={selectedDeveloper || ""}
                    onChange={(e) => setSelectedDeveloper(e.target.value || null)}
                >
                    <option value="">All Developers</option>
                    {metricsData.prMetrics.map((item) => (
                        <option key={item.developer} value={item.developer}>
                            {item.developer}
                        </option>
                    ))}
                </select>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <ChartCard title="Commit Frequency">
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={filteredCommitFrequency}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="frequency" stroke="#8884d8" />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="PR Metrics">
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={metricsData.prMetrics}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="developer" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="frequency" fill="#8884d8" name="PR Count" />
                            <Bar dataKey="mergeRate" fill="#82ca9d" name="Merge Rate" />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Team Velocity">
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={metricsData.teamVelocity}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="sprint" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="velocity" stroke="#82ca9d" />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="PR Merge Frequency">
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={metricsData.prMergeFrequency}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="count" fill="#8884d8" />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>

            {/* Collaboration Matrix */}
            <ChartCard title="Collaboration Matrix">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Reviewer / Author
                                </th>
                                {Object.keys(metricsData.collaborationMatrix).map((reviewer) => (
                                    <th
                                        key={reviewer}
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                    >
                                        {reviewer}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {Object.entries(metricsData.collaborationMatrix).map(
                                ([reviewer, authors]) => (
                                    <tr key={reviewer}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {reviewer}
                                        </td>
                                        {Object.keys(metricsData.collaborationMatrix).map(
                                            (author) => (
                                                <td
                                                    key={author}
                                                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                                                >
                                                    {authors[author] || 0}
                                                </td>
                                            )
                                        )}
                                    </tr>
                                )
                            )}
                        </tbody>
                    </table>
                </div>
            </ChartCard>

            {/* Areas of Expertise */}
            <ChartCard title="Areas of Expertise">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.entries(metricsData.areasOfExpertise).map(([developer, areas]) => (
                        <div key={developer} className="bg-gray-50 rounded-lg p-4">
                            <h3 className="text-lg font-semibold mb-2 text-gray-700">
                                {developer}
                            </h3>
                            <ul className="list-disc list-inside">
                                {areas.map((area) => (
                                    <li key={area} className="text-sm text-gray-600">
                                        {area}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </ChartCard>
        </div>
    );
};

const ChartCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white rounded-lg shadow-md p-6 transition-all duration-300 hover:shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">{title}</h2>
        {children}
    </div>
);

export default Dashboard;
