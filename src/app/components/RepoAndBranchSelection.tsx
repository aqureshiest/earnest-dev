import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Search, Check, ChevronDown, Loader2 } from "lucide-react";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { debounce } from "lodash";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

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
    const [searchQuery, setSearchQuery] = useState(repo || "");
    const [loadingRepos, setLoadingRepos] = useState(false);
    const [loadingBranches, setLoadingBranches] = useState(false);
    const [showRepoSuggestions, setShowRepoSuggestions] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);

    const repoInputRef = useRef<HTMLInputElement>(null);
    const repoSuggestionsRef = useRef<HTMLDivElement>(null);

    const owner = process.env.NEXT_PUBLIC_GITHUB_OWNER!;

    // Fetch branches for a repository
    const fetchBranches = async (repoName: string) => {
        if (!repoName) return;

        try {
            setLoadingBranches(true);

            const response = await fetch("/api/gh", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "list-branches", owner, repo: repoName }),
            });

            if (!response.ok) throw new Error("Failed to fetch branches");

            const data = await response.json();
            const branchNames = data.map((branch: any) => branch.name);

            setBranches(branchNames);

            // Set default branch if we're changing repos
            if (!branch || !branchNames.includes(branch)) {
                const mainBranch = data.find(
                    (branch: any) => branch.name === "main" || branch.name === "master"
                );
                const newBranch = mainBranch ? mainBranch.name : data[0]?.name || "";
                setBranch(newBranch);
            }
        } catch (error) {
            console.error("Error fetching branches:", error);
        } finally {
            setLoadingBranches(false);
        }
    };

    // Fetch repositories with search query
    const fetchRepos = useCallback(async (query = "") => {
        if (query.length < 3 && query.length > 0) return;

        try {
            setLoadingRepos(true);

            const response = await fetch("/api/gh", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "list-repos",
                    query,
                    per_page: 50, // Reduced to improve performance
                }),
            });

            if (!response.ok) throw new Error("Failed to fetch repositories");

            const data = await response.json();
            setRepos(data.items.map((repo: any) => ({ name: repo.name })));
        } catch (error) {
            console.error("Error fetching repositories:", error);
        } finally {
            setLoadingRepos(false);
        }
    }, []);

    // Debounce search with proper cleanup
    const debouncedSearch = useCallback(
        debounce((query: string) => {
            fetchRepos(query);
        }, 300),
        [fetchRepos]
    );

    // Handle repository search input change
    const handleRepoSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearchQuery(query);

        if (query.length >= 3 || query.length === 0) {
            debouncedSearch(query);
        }

        // Show suggestions dropdown when typing
        if (query.length > 0) {
            setShowRepoSuggestions(true);
            // Reset highlighted index when query changes
            setHighlightedIndex(-1);
        }
    };

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        // Only process if suggestions are showing and we have repos
        if (!showRepoSuggestions || repos.length === 0) return;

        switch (e.key) {
            case "ArrowDown":
                // Prevent cursor from moving in input
                e.preventDefault();
                setHighlightedIndex((prev) => (prev < repos.length - 1 ? prev + 1 : 0));
                break;

            case "ArrowUp":
                e.preventDefault();
                setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : repos.length - 1));
                break;

            case "Enter":
                e.preventDefault();
                if (highlightedIndex >= 0 && highlightedIndex < repos.length) {
                    selectRepo(repos[highlightedIndex].name);
                }
                break;

            case "Escape":
                e.preventDefault();
                setShowRepoSuggestions(false);
                // Restore to current repo value if escaping
                setSearchQuery(repo || "");
                break;
        }
    };

    // Load repositories on initial mount
    useEffect(() => {
        fetchRepos();

        return () => {
            debouncedSearch.cancel();
        };
    }, []);

    // Update search query when repo prop changes
    useEffect(() => {
        if (repo && repo !== searchQuery) {
            setSearchQuery(repo);
        }
    }, [repo]);

    // Fetch branches when repo changes
    useEffect(() => {
        if (repo) {
            fetchBranches(repo);
        } else {
            setBranches([]);
        }
    }, [repo]);

    // Reset highlighted index when suggestions visibility changes
    useEffect(() => {
        if (showRepoSuggestions) {
            setHighlightedIndex(-1);
        }
    }, [showRepoSuggestions]);

    // Set up click outside listeners to close dropdowns
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Close repo suggestions if clicked outside
            if (
                repoSuggestionsRef.current &&
                repoInputRef.current &&
                !repoSuggestionsRef.current.contains(event.target as Node) &&
                !repoInputRef.current.contains(event.target as Node)
            ) {
                setShowRepoSuggestions(false);

                // If we click outside and the query doesn't match a selected repo, reset to selected repo
                if (searchQuery !== repo) {
                    setSearchQuery(repo || "");
                }
            }
        };

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [repo, searchQuery]);

    // Select a repository
    const selectRepo = (repoName: string) => {
        setRepo(repoName);
        setSearchQuery(repoName);
        setShowRepoSuggestions(false);
    };

    return (
        <div className="space-y-4">
            {/* Repository Autocomplete */}
            <div>
                <Label htmlFor="repo" className="block mb-2">
                    Repository{" "}
                    {loadingRepos && <Loader2 className="ml-2 h-4 w-4 inline animate-spin" />}
                </Label>
                <div className="relative">
                    <div className="relative">
                        <Input
                            id="repo"
                            ref={repoInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={handleRepoSearchChange}
                            onKeyDown={handleKeyDown}
                            placeholder="Search for a repository..."
                            className="pl-8 pr-4 w-full"
                            disabled={loading}
                            onFocus={() => {
                                if (searchQuery || repos.length > 0) setShowRepoSuggestions(true);
                            }}
                        />
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                        <button
                            type="button"
                            className="absolute right-2 top-2.5"
                            onClick={() => setShowRepoSuggestions((prev) => !prev)}
                            disabled={loading}
                        >
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                        </button>
                    </div>

                    {/* Repository suggestions dropdown */}
                    {showRepoSuggestions && (
                        <div
                            ref={repoSuggestionsRef}
                            className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-950 rounded-md shadow-lg border border-gray-200 dark:border-gray-800 max-h-60 overflow-auto"
                        >
                            {loadingRepos ? (
                                <div className="px-3 py-2 text-sm text-gray-500 flex items-center">
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Loading repositories...
                                </div>
                            ) : repos.length > 0 ? (
                                repos.map((repoItem, index) => (
                                    <div
                                        key={repoItem.name}
                                        className={`px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-between ${
                                            highlightedIndex === index
                                                ? "bg-blue-100 dark:bg-blue-900"
                                                : repo === repoItem.name
                                                ? "bg-gray-100 dark:bg-gray-800"
                                                : ""
                                        }`}
                                        onClick={() => selectRepo(repoItem.name)}
                                        onMouseEnter={() => setHighlightedIndex(index)}
                                    >
                                        <span>{repoItem.name}</span>
                                        {repo === repoItem.name && (
                                            <Check className="h-4 w-4 text-green-500" />
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="px-3 py-2 text-sm text-gray-500">
                                    {searchQuery.length > 0 && searchQuery.length < 3
                                        ? "Type at least 3 characters to search"
                                        : searchQuery.length >= 3
                                        ? "No matching repositories found"
                                        : "No repositories available"}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Branch Dropdown (Using Select component) */}
            <div>
                <Label htmlFor="branch" className="block mb-2">
                    Branch{" "}
                    {loadingBranches && <Loader2 className="ml-2 h-4 w-4 inline animate-spin" />}
                </Label>
                <Select
                    value={branch}
                    onValueChange={setBranch}
                    disabled={loading || !repo || loadingBranches}
                >
                    <SelectTrigger id="branch" className="w-full">
                        <SelectValue placeholder="Select a branch" />
                    </SelectTrigger>
                    <SelectContent>
                        {loadingBranches ? (
                            <div className="flex items-center justify-center py-2">
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                <span>Loading branches...</span>
                            </div>
                        ) : branches.length > 0 ? (
                            branches.map((branchName) => (
                                <SelectItem key={branchName} value={branchName}>
                                    {branchName}
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
    );
};

export default RepoAndBranchSelection;
