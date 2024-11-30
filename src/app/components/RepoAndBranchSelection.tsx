import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import React, { useState, useEffect } from "react";

interface Repo {
    name: string;
}

interface Props {
    repo: string;
    branch: string;
    setRepo: (repo: string) => void;
    setBranch: (branch: string) => void;
    loading: boolean;
}

const RepoAndBranchSelection = ({ repo, branch, setRepo, setBranch, loading }: Props) => {
    const [repos, setRepos] = useState<Repo[]>([]);
    const [branches, setBranches] = useState<string[]>([]);

    const [loadingRepos, setLoadingRepos] = useState(false);
    const [loadingBranches, setLoadingBranches] = useState(false);

    const owner = process.env.NEXT_PUBLIC_GITHUB_OWNER!;

    const fetchBranches = async () => {
        if (!repo) return;

        try {
            setLoadingBranches(true);

            // fetch api call to /api/gh
            const response = await fetch("/api/gh", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "list-branches", owner, repo }),
            });

            if (!response.ok) throw new Error("Failed to fetch branches");

            const data = await response.json();

            setBranches(data.map((branch: any) => branch.name));
            const mainBranch = data.find(
                (branch: any) => branch.name === "main" || branch.name === "master"
            );
            setBranch(mainBranch ? mainBranch.name : data[0].name);
        } catch (error) {
            console.error("Error fetching branches:", error);
        } finally {
            setLoadingBranches(false);
        }
    };

    // Fetch repositories on page load
    useEffect(() => {
        async function fetchRepos() {
            try {
                setLoadingRepos(true);

                const response = await fetch("/api/gh", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "list-repos" }),
                });

                if (!response.ok) throw new Error("Failed to fetch repositories");

                const data = await response.json();
                setRepos(data.map((repo: any) => ({ name: repo.name })));
            } catch (error) {
                console.error("Error fetching repositories:", error);
            } finally {
                setLoadingRepos(false);
            }
        }

        fetchRepos();
    }, []);

    // Fetch branches when a repository is selected
    useEffect(() => {
        if (!repo) return;

        fetchBranches();
    }, [repo]);

    return (
        <>
            <div>
                <Label htmlFor="repo" className="block mb-2">
                    Selected Repository
                </Label>
                <Select value={repo} onValueChange={(value) => setRepo(value)} disabled={loading}>
                    <SelectTrigger id="repo">
                        <SelectValue placeholder="Select a repository" />
                    </SelectTrigger>
                    <SelectContent>
                        {repos.map((repo) => (
                            <SelectItem key={repo.name} value={repo.name}>
                                {repo.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div>
                <Label htmlFor="branch" className="block mb-2">
                    Selected Branch
                </Label>
                <Select
                    value={branch}
                    onValueChange={(value) => setBranch(value)}
                    disabled={loading}
                >
                    <SelectTrigger id="branch">
                        <SelectValue placeholder="Select a branch" />
                    </SelectTrigger>
                    <SelectContent>
                        {branches.map((branch) => (
                            <SelectItem key={branch} value={branch}>
                                {branch}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </>
    );
};

export default RepoAndBranchSelection;
