import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import React, { useState, useEffect, useCallback } from "react";
import { debounce } from "lodash";

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
    const [searchQuery, setSearchQuery] = useState("");
    const [loadingRepos, setLoadingRepos] = useState(false);
    const [loadingBranches, setLoadingBranches] = useState(false);
    const [totalRepoCount, setTotalRepoCount] = useState(0);
    const [isSelectOpen, setIsSelectOpen] = useState(false);

    const owner = process.env.NEXT_PUBLIC_GITHUB_OWNER!;

    const fetchBranches = async () => {
        if (!repo) return;

        try {
            setLoadingBranches(true);

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
            setBranch(mainBranch ? mainBranch.name : data[0]?.name);
        } catch (error) {
            console.error("Error fetching branches:", error);
        } finally {
            setLoadingBranches(false);
        }
    };

    // Fetch repositories with search query
    const fetchRepos = useCallback(async (query = "") => {
        try {
            setLoadingRepos(true);

            const response = await fetch("/api/gh", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "list-repos",
                    query,
                    per_page: 25,
                }),
            });

            if (!response.ok) throw new Error("Failed to fetch repositories");

            const data = await response.json();
            setRepos(data.items.map((repo: any) => ({ name: repo.name })));
            setTotalRepoCount(data.total_count);
        } catch (error) {
            console.error("Error fetching repositories:", error);
        } finally {
            setLoadingRepos(false);
        }
    }, []);

    // Debounce search to avoid too many API calls
    const debouncedSearch = useCallback(
        debounce((query: string) => {
            fetchRepos(query);
        }, 500),
        [fetchRepos]
    );

    // Handle search input change
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearchQuery(query);
        debouncedSearch(query);
    };

    // Initial load of repositories
    useEffect(() => {
        fetchRepos();
    }, [fetchRepos]);

    // Fetch branches when a repository is selected
    useEffect(() => {
        if (!repo) return;
        fetchBranches();
    }, [repo]);

    return (
        <>
            <div className="space-y-4">
                <div>
                    <Label htmlFor="repo" className="block mb-2">
                        Repository {loadingRepos && "(Loading...)"}
                    </Label>
                    <div className="relative">
                        <Select
                            value={repo}
                            onValueChange={(value) => setRepo(value)}
                            disabled={loading || loadingRepos}
                            onOpenChange={(open) => setIsSelectOpen(open)}
                        >
                            <SelectTrigger id="repo" className="w-full">
                                <SelectValue placeholder="Select or search for a repository" />
                            </SelectTrigger>
                            <SelectContent className="w-full">
                                <div className="px-3 py-2 sticky top-0 bg-white dark:bg-gray-950 border-b z-10">
                                    <div className="relative">
                                        <Input
                                            placeholder="Search repositories..."
                                            value={searchQuery}
                                            onChange={handleSearchChange}
                                            className="pl-8"
                                            autoFocus
                                        />
                                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                                    </div>
                                </div>
                                <div className="max-h-60 overflow-auto">
                                    {repos.length > 0 ? (
                                        repos.map((repo) => (
                                            <SelectItem key={repo.name} value={repo.name}>
                                                {repo.name}
                                            </SelectItem>
                                        ))
                                    ) : (
                                        <div className="px-2 py-6 text-sm text-center text-gray-500">
                                            {searchQuery
                                                ? "No matching repositories found"
                                                : "No repositories available"}
                                        </div>
                                    )}
                                </div>
                                {totalRepoCount > repos.length && (
                                    <div className="px-3 py-2 text-xs text-gray-500 border-t sticky bottom-0 bg-white dark:bg-gray-950">
                                        Showing {repos.length} of {totalRepoCount} repositories.
                                        Refine your search to find more.
                                    </div>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div>
                    <Label htmlFor="branch" className="block mb-2">
                        Branch {loadingBranches && "(Loading...)"}
                    </Label>
                    <Select
                        value={branch}
                        onValueChange={(value) => setBranch(value)}
                        disabled={loading || !repo || loadingBranches}
                    >
                        <SelectTrigger id="branch">
                            <SelectValue placeholder="Select a branch" />
                        </SelectTrigger>
                        <SelectContent>
                            {branches.length > 0 ? (
                                branches.map((branch) => (
                                    <SelectItem key={branch} value={branch}>
                                        {branch}
                                    </SelectItem>
                                ))
                            ) : (
                                <div className="px-2 py-1 text-sm text-gray-500">
                                    {repo ? "No branches available" : "Select a repository first"}
                                </div>
                            )}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </>
    );
};

export default RepoAndBranchSelection;
