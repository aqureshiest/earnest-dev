"use client";

import React, { useState, useEffect } from "react";
import { LLM_MODELS } from "@/modules/utils/llmInfo";
import ProgressFeed from "../components/ProgressFeed";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, GitBranch, FileText, Bot, Ticket } from "lucide-react";

const JiraTicketGenerator: React.FC = () => {
    const [repos, setRepos] = useState<string[]>([]);
    const [branches, setBranches] = useState<string[]>([]);
    const [loadingRepos, setLoadingRepos] = useState(false);
    const [loadingBranches, setLoadingBranches] = useState(false);
    const [taskId, setTaskId] = useState("");
    const [repo, setRepo] = useState("");
    const [branch, setBranch] = useState("");
    const [designDoc, setDesignDoc] = useState<File | null>(null);
    const [selectedModel, setSelectedModel] = useState(LLM_MODELS.ANTHROPIC_CLAUDE_3_5_SONNET);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState<string[]>([]);

    const availableModels = [
        LLM_MODELS.OPENAI_GPT_4O,
        LLM_MODELS.OPENAI_GPT_4O_MINI,
        LLM_MODELS.ANTHROPIC_CLAUDE_3_5_SONNET,
        LLM_MODELS.ANTHROPIC_CLAUDE_3_HAIKU,
    ];

    // Fetch repositories (placeholder)
    useEffect(() => {
        setLoadingRepos(true);
        // Simulated API call
        setTimeout(() => {
            setRepos(["repo1", "repo2", "repo3"]);
            setLoadingRepos(false);
        }, 1000);
    }, []);

    // Fetch branches when a repository is selected (placeholder)
    useEffect(() => {
        if (!repo) return;
        setLoadingBranches(true);
        // Simulated API call
        setTimeout(() => {
            setBranches(["main", "develop", "feature/new-ui"]);
            setLoadingBranches(false);
        }, 1000);
    }, [repo]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setDesignDoc(event.target.files[0]);
        }
    };

    const handleGenerateTickets = async () => {
        setIsGenerating(true);
        setTaskId(Date.now().toString());
        setProgress([]);
        // Simulated ticket generation process
        for (let i = 1; i <= 5; i++) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            setProgress((prev) => [...prev, `Generating ticket ${i} of 5...`]);
        }
        setProgress((prev) => [...prev, "Ticket generation complete!"]);
        setIsGenerating(false);
    };

    return (
        <div className="min-h-screen py-8 px-6">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left column: Form */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Generate Jira Tickets</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {/* Repository Selection */}
                                <div>
                                    <Label htmlFor="repo">Repository</Label>
                                    <Select
                                        value={repo}
                                        onValueChange={setRepo}
                                        disabled={isGenerating}
                                    >
                                        <SelectTrigger id="repo">
                                            <SelectValue placeholder="Select a repository" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {repos.map((repo) => (
                                                <SelectItem key={repo} value={repo}>
                                                    {repo}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Branch Selection */}
                                <div>
                                    <Label htmlFor="branch">Branch</Label>
                                    <Select
                                        value={branch}
                                        onValueChange={setBranch}
                                        disabled={isGenerating || !repo}
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

                                {/* Design Document Upload */}
                                <div>
                                    <Label htmlFor="designDoc">Design Document</Label>
                                    <input
                                        id="designDoc"
                                        type="file"
                                        onChange={handleFileChange}
                                        disabled={isGenerating}
                                        className="mt-1 block w-full text-sm text-slate-500
                                        file:mr-4 file:py-2 file:px-4
                                        file:rounded-full file:border-0
                                        file:text-sm file:font-semibold
                                        file:bg-violet-50 file:text-violet-700
                                        hover:file:bg-violet-100"
                                    />
                                </div>

                                {/* AI Model Selection */}
                                <div>
                                    <Label htmlFor="aiModel">AI Model</Label>
                                    <Select
                                        value={selectedModel}
                                        onValueChange={setSelectedModel}
                                        disabled={isGenerating}
                                    >
                                        <SelectTrigger id="aiModel">
                                            <SelectValue placeholder="Select an AI model" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableModels.map((model) => (
                                                <SelectItem key={model} value={model}>
                                                    {model.replace(/_/g, " ")}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Generate Button */}
                                <Button
                                    onClick={handleGenerateTickets}
                                    className="w-full"
                                    disabled={isGenerating || !repo || !branch || !designDoc}
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <Ticket className="mr-2 h-4 w-4" />
                                            Generate Jira Tickets
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Right column: Progress Feed */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Progress</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ProgressFeed taskId={taskId} progress={progress} currentFile={null} />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default JiraTicketGenerator;
