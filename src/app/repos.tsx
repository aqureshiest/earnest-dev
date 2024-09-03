"use client";

import React, { useState, useEffect } from "react";
import { Octokit } from "@octokit/rest";
import PRModal from "./components/PRModal";
import { useRouter } from "next/navigation";

interface PullRequest {
    id: number;
    title: string;
    url: string;
    user: {
        login: string;
    };
    created_at: string;
    state: string;
}

interface Repo {
    name: string;
}

const Home: React.FC = () => {
    const [repos, setRepos] = useState<Repo[]>([]);
    const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
    const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
    const [branches, setBranches] = useState<string[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const router = useRouter();

    const octokit = new Octokit({ auth: process.env.NEXT_PUBLIC_GITHUB_TOKEN });

    const fetchBranches = async () => {
        if (!selectedRepo) return;

        try {
            const octokit = new Octokit({ auth: process.env.NEXT_PUBLIC_GITHUB_TOKEN });
            const { data } = await octokit.repos.listBranches({
                owner: process.env.NEXT_PUBLIC_GITHUB_OWNER!,
                repo: selectedRepo,
            });
            setBranches(data.map((branch) => branch.name));
            const mainBranch = data.find(
                (branch) => branch.name === "main" || branch.name === "master"
            );
            setSelectedBranch(mainBranch ? mainBranch.name : data[0].name);
        } catch (error) {
            console.error("Error fetching branches:", error);
        }
    };

    const fetchPullRequests = async () => {
        if (!selectedRepo || !selectedBranch) return;

        try {
            const { data } = await octokit.pulls.list({
                owner: process.env.NEXT_PUBLIC_GITHUB_OWNER!,
                repo: selectedRepo!,
                base: selectedBranch!,
                state: "all",
            });
            setPullRequests(
                data.map((pr: any) => ({
                    id: pr.id,
                    title: pr.title,
                    url: pr.html_url,
                    user: pr.user,
                    created_at: pr.created_at,
                    state: pr.state,
                }))
            );
        } catch (error) {
            console.error("Error fetching pull requests:", error);
        }
    };

    // Fetch repositories on page load
    useEffect(() => {
        async function fetchRepos() {
            try {
                const { data } = await octokit.repos.listForAuthenticatedUser();
                setRepos(data.map((repo: any) => ({ name: repo.name })));
            } catch (error) {
                console.error("Error fetching repositories:", error);
            }
        }

        fetchRepos();
    }, [octokit]);

    // Fetch branches when a repository is selected
    useEffect(() => {
        if (!selectedRepo) return;

        fetchBranches();
    }, [selectedRepo]);

    // Fetch pull requests when a repository is selected
    useEffect(() => {
        if (!selectedRepo || !selectedBranch) return;

        console.log("Fetching pull requests...");

        fetchPullRequests();
    }, [selectedRepo, selectedBranch]);

    const handleRepoChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedRepo(event.target.value);
        setPullRequests([]);
        setBranches([]);
    };

    const handleBranchChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedBranch(event.target.value);
    };

    const handleCreatePR = () => {
        router.push(`/pullrequest?repo=${selectedRepo}&branch=${selectedBranch}`);
    };

    const openModal = () => setIsModalOpen(true);
    const closeModal = () => {
        setIsModalOpen(false);
        // refresh branches
        fetchBranches();
        // refetch pull requests
        fetchPullRequests();
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-6">
            <main className="max-w-7xl mx-auto">
                <header className="flex justify-between items-center mb-6 text-gray-800">
                    <h1 className="text-3xl font-bold">Pull Requests</h1>
                    <div className="flex items-center gap-x-3">
                        {/* <button
                            className="bg-teal-600 text-white px-4 py-2 rounded-lg shadow hover:bg-teal-500 transition duration-150"
                            onClick={openModal}
                            disabled={!selectedRepo || !selectedBranch}
                        >
                            Create Pull Request
                        </button> */}
                        <button
                            onClick={() => handleCreatePR()}
                            className="bg-teal-600 text-white px-4 py-2 rounded-lg shadow hover:bg-teal-500 transition duration-150 disabled:opacity-50 disabled:hover:bg-teal-600"
                            disabled={!selectedRepo || !selectedBranch}
                        >
                            Create Pull Request
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 max-w-[800px]">
                    <div>
                        <label className="block text-sm font-medium text-gray-600">
                            Select Repository
                        </label>
                        <select
                            value={selectedRepo ?? ""}
                            onChange={handleRepoChange}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        >
                            <option value="" disabled>
                                Select a repository...
                            </option>
                            {repos.map((repo) => (
                                <option key={repo.name} value={repo.name}>
                                    {repo.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedRepo && (
                        <div>
                            <label className="block text-sm font-medium text-gray-600">
                                Select Branch
                            </label>
                            <select
                                value={selectedBranch ?? ""}
                                onChange={handleBranchChange}
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            >
                                {branches.map((branch) => (
                                    <option key={branch} value={branch}>
                                        {branch}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Title
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Author
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Date Created
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {pullRequests.map((pr) => (
                                <tr key={pr.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <a
                                            href={pr.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-500 hover:underline"
                                        >
                                            {pr.title}
                                        </a>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">{pr.user.login}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {new Date(pr.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span
                                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                pr.state === "open"
                                                    ? "bg-teal-100 text-teal-800"
                                                    : "bg-red-100 text-red-800"
                                            }`}
                                        >
                                            {pr.state}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {selectedRepo && selectedBranch && (
                    <PRModal
                        isOpen={isModalOpen}
                        onRequestClose={closeModal}
                        owner={process.env.NEXT_PUBLIC_GITHUB_OWNER!}
                        repo={selectedRepo}
                        branch={selectedBranch}
                    />
                )}
            </main>
        </div>
    );
};

export default Home;
