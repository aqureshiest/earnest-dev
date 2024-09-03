import React from "react";
import { Users, Code, GitPullRequest, GitCommit, Clock, Search, Briefcase } from "lucide-react";

const teamsData = [
    {
        id: 1,
        name: "Frontend Team",
        members: 15,
        repositories: 12,
        prMetrics: {
            totalPRs: 230,
            avgPRSize: 84,
            mergeRate: 92,
        },
        avgTimeToMerge: "2d 4h",
        commitFrequency: 18,
        image: "https://cdn.usegalileo.ai/sdxl10/64eb679b-a0e8-463d-8916-f80414e74d81.png",
    },
    {
        id: 2,
        name: "Backend Team",
        members: 12,
        repositories: 15,
        prMetrics: {
            totalPRs: 180,
            avgPRSize: 120,
            mergeRate: 88,
        },
        avgTimeToMerge: "1d 18h",
        commitFrequency: 22,
        image: "https://cdn.usegalileo.ai/sdxl10/0cae1499-efb2-48fe-9944-2a9e95673b84.png",
    },
    {
        id: 3,
        name: "Mobile Team",
        members: 8,
        repositories: 10,
        prMetrics: {
            totalPRs: 150,
            avgPRSize: 95,
            mergeRate: 90,
        },
        avgTimeToMerge: "1d 12h",
        commitFrequency: 15,
        image: "https://cdn.usegalileo.ai/sdxl10/878f3c66-b13a-4985-958b-6cb15a837f94.png",
    },
    {
        id: 4,
        name: "Data Science Team",
        members: 7,
        repositories: 8,
        prMetrics: {
            totalPRs: 120,
            avgPRSize: 150,
            mergeRate: 85,
        },
        avgTimeToMerge: "2d 2h",
        commitFrequency: 12,
        image: "https://cdn.usegalileo.ai/sdxl10/2bd11d93-9e24-42f5-b5a7-f2964e935fc9.png",
    },
];

const HomePage = () => {
    return (
        <div className="min-h-screen bg-gray-50 py-8 px-6">
            <div className="max-w-7xl mx-auto">
                <header className="flex items-center justify-end mb-4">
                    <button className="bg-teal-700 text-white px-4 py-2 rounded-md hover:bg-teal-600 transition">
                        Manage Teams
                    </button>
                </header>

                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h1 className="text-2xl font-semibold text-gray-800 mb-2">Engineering teams</h1>
                    <p className="text-gray-600 mb-4">
                        Explore the different engineering teams and their repositories
                    </p>

                    <div className="mb-6">
                        <div className="relative">
                            <Search
                                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                size={20}
                            />
                            <input
                                placeholder="Search for a team by name"
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                        {[
                            { label: "Active PRs", value: 45, icon: GitPullRequest },
                            { label: "Avg PR Review Time", value: "1d 4h", icon: Clock },
                            { label: "Recent Commits", value: 287, icon: GitCommit },
                        ].map((item, index) => (
                            <div
                                key={index}
                                className="bg-gray-50 rounded-lg p-4 flex items-center space-x-4"
                            >
                                <item.icon className="text-teal-600" size={24} />
                                <div>
                                    <p className="text-2xl font-bold text-gray-800">{item.value}</p>
                                    <p className="text-sm text-gray-600">{item.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {teamsData.map((team) => (
                            <div
                                key={team.id}
                                className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden hover:bg-gray-50 hover:cursor-pointer"
                            >
                                <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-teal-50">
                                    <div className="flex items-center space-x-3">
                                        <div
                                            className="w-10 h-10 rounded-full bg-cover bg-center"
                                            style={{ backgroundImage: `url(${team.image})` }}
                                        />
                                        <div className="flex items-center space-x-2">
                                            {/* <Briefcase className="text-gray-400" size={16} /> */}
                                            <h3 className="text-lg font-semibold text-gray-800">
                                                {team.name}
                                            </h3>
                                        </div>
                                    </div>
                                    <div className="flex items-center text-gray-600">
                                        <Users size={16} className="mr-1" />
                                        <span>{team.members}</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 divide-x divide-gray-200">
                                    <MetricItem
                                        icon={Code}
                                        label="Repos"
                                        value={team.repositories}
                                    />
                                    <MetricItem
                                        icon={GitPullRequest}
                                        label="PRs"
                                        value={team.prMetrics.totalPRs}
                                    />
                                    <MetricItem
                                        icon={GitCommit}
                                        label="Commits/day"
                                        value={team.commitFrequency}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const MetricItem = ({ icon: Icon, label, value }) => (
    <div className="flex flex-col items-center justify-center p-4">
        <Icon className="text-teal-600 mb-2" size={20} />
        <p className="text-xl font-semibold text-gray-800">{value}</p>
        <p className="text-sm text-gray-600">{label}</p>
    </div>
);

export default HomePage;
