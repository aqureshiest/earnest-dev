"use client";

import React, { useState, useEffect } from "react";
import { LLM_MODELS } from "@/modules/utils/llmInfo";
import ProgressFeed from "../components/ProgressFeed";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { FolderOpen, Loader2, Save, Ticket } from "lucide-react";
import { motion } from "framer-motion";
import TasksProgressBar from "../components/TasksProgressBar";
import JiraItemsDisplay from "../components/JiraItemsDisplay";
import {
    DialogHeader,
    DialogFooter,
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface Repo {
    name: string;
}

const JiraTicketGenerator: React.FC = () => {
    const [repos, setRepos] = useState<Repo[]>([]);
    const [branches, setBranches] = useState<string[]>([]);

    const [loadingRepos, setLoadingRepos] = useState(false);
    const [loadingBranches, setLoadingBranches] = useState(false);

    const [taskId, setTaskId] = useState("");
    const [repo, setRepo] = useState("");
    const [branch, setBranch] = useState("");
    const [designDoc, setDesignDoc] = useState<File | null>(null);
    const [selectedModel, setSelectedModel] = useState(LLM_MODELS.ANTHROPIC_CLAUDE_3_5_SONNET);

    const [jiraItems, setJiraItems] = useState<JiraItems[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isComplete, setIsComplete] = useState(false);

    const [progress, setProgress] = useState<string[]>([]);
    const [taskProgress, setTaskProgress] = useState<{ current: number; total: number } | null>(
        null
    );

    const availableModels = [
        LLM_MODELS.OPENAI_GPT_4O,
        LLM_MODELS.OPENAI_GPT_4O_MINI,
        LLM_MODELS.ANTHROPIC_CLAUDE_3_5_SONNET,
        LLM_MODELS.ANTHROPIC_CLAUDE_3_HAIKU,
    ];

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

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setDesignDoc(event.target.files[0]);
        }
    };

    const uploadAndProcessDesignDoc = async () => {
        if (!designDoc) {
            console.error("No file selected");
            return;
        }

        setProgress((prev) => [...prev, "Uploading Technical Design document..."]);

        const form = new FormData();
        form.append("file", designDoc, designDoc.name);

        const uploadResponse = await fetch("http://localhost:8000/parse-pdf/", {
            method: "POST",
            body: form,
            headers: {
                Accept: "application/json",
                // Note: Do not set Content-Type header when using FormData
                // The browser will set it automatically with the correct boundary
            },
        });

        if (!uploadResponse.ok) {
            throw new Error(`Upload failed: ${uploadResponse.statusText}`);
        }

        const uploadResult = await uploadResponse.json();
        setProgress((prev) => [...prev, "Upload processed successfully"]);
        return uploadResult;
    };

    const handleGenerateTickets = async () => {
        setIsGenerating(true);
        const newTaskId = Date.now().toString();
        setTaskId(newTaskId);
        resetState();

        try {
            setProgress((prev) => [...prev, `Task ${newTaskId} started`]);

            // Step 1: Upload and process the file
            const tddContent = await uploadAndProcessDesignDoc();

            // Step 2: Generate tickets
            const request = {
                taskId: newTaskId,
                owner,
                repo,
                branch,
                selectedModel,
                tddContent: tddContent.content,
            };

            const response = await fetch("/api/jira", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(request),
            });

            if (!response.ok) {
                throw new Error(`Task failed: ${response.statusText}`);
            }

            // Listen for stream response
            await handleStreamResponse(response);
        } catch (error: any) {
            console.error("Error during ticket generation:", error);
            setProgress((prev) => [...prev, `Error: ${error.message}`]);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleStreamResponse = async (response: Response) => {
        const reader = response.body?.getReader();
        if (!reader) throw new Error("Failed to get stream reader");

        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split("\n\n");

            for (const line of lines) {
                if (line.startsWith("data: ")) {
                    const data = JSON.parse(line.slice(6));
                    handleResponseData(data);
                }
            }
        }
    };

    const handleResponseData = (data: any) => {
        switch (data.type) {
            case "progress":
                handleProgress(data);
                break;
            case "error":
                handleError(new Error(data.message));
                break;
            case "tasks-progress":
                handleTasksProgress(data.message);
                break;
            case "complete":
                handleComplete(data);
                break;
            case "final":
                handleFinal(data);
                break;
        }
    };

    const handleProgress = (data: any) => {
        setProgress((prev) => [...prev, data.message]);
    };

    const handleComplete = (data: any) => {
        console.log("Task complete:", data.message);
        setJiraItems((prevItems) => [...prevItems, data.message]);
        setProgress((prev) => [...prev, `Received epic: ${data.message.epic.title}`]);
    };

    const handleTasksProgress = (data: { current: number; numberOfTasks: number }) => {
        setTaskProgress({ current: data.current, total: data.numberOfTasks });
    };

    const handleFinal = (data: any) => {
        // setProgress((prev) => [...prev, data.message]);
        setIsComplete(true);
    };

    const handleError = (error: Error) => {
        console.error(error);
        setProgress((prev) => [...prev, error.message]);
    };

    const resetState = () => {
        setProgress([]);
        setJiraItems([]);
        setIsComplete(false);
        setTaskProgress(null);
    };

    return (
        <div className="min-h-screen py-8 px-6">
            <div className="max-w-7xl mx-auto">
                <motion.h1
                    className="text-3xl font-semibold text-center mb-8 text-gray-800 dark:text-gray-100"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    Jira Tickets Generator
                </motion.h1>

                {/* New: Save/Load Project Buttons 
                <motion.div
                    className="flex justify-end mb-4 space-x-2"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                >
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <Save className="w-4 h-4 mr-2" />
                                Save Project
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Save Project</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="projectName" className="text-right">
                                        Project Name
                                    </Label>
                                    <Input id="projectName" className="col-span-3" />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit">Save</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <FolderOpen className="w-4 h-4 mr-2" />
                                Load Project
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Load Project</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="loadProject" className="text-right">
                                        Select Project
                                    </Label>
                                    <Select>
                                        <SelectTrigger id="loadProject" className="col-span-3">
                                            <SelectValue placeholder="Choose a project" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="project1">Project 1</SelectItem>
                                            <SelectItem value="project2">Project 2</SelectItem>                                            
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit">Load</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </motion.div>*/}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left column: Form */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        <Card>
                            <CardHeader>
                                <CardTitle>Generate Jira Tickets</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {/* Selected Repository and Branch */}
                                    <div>
                                        <div className="flex items-center mb-2">
                                            <Label htmlFor="repo">Selected Repository</Label>
                                            {loadingRepos && (
                                                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                                            )}
                                        </div>
                                        <Select
                                            value={repo}
                                            onValueChange={(value) => setRepo(value)}
                                            disabled={isGenerating}
                                        >
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
                                        <div className="flex items-center mb-2">
                                            <Label htmlFor="branch">Selected Branch</Label>
                                            {loadingBranches && (
                                                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                                            )}
                                        </div>
                                        <Select
                                            value={branch}
                                            onValueChange={(value) => setBranch(value)}
                                            disabled={isGenerating}
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
                                        <Label htmlFor="designDoc">Technical Design Document</Label>
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
                    </motion.div>

                    {/* Right column: Progress Feed */}
                    <div>
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.5, delay: 0.4 }}
                        >
                            <ProgressFeed progress={progress} />
                        </motion.div>

                        {/* Task Progress Bar */}
                        {taskProgress && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                            >
                                <TasksProgressBar
                                    current={taskProgress.current}
                                    total={taskProgress.total}
                                />
                            </motion.div>
                        )}
                    </div>
                </div>

                {/* Epics and Tickets Display */}
                {jiraItems.length > 0 && (
                    <motion.div
                        className="mt-12"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.6 }}
                    >
                        <JiraItemsDisplay jiraItems={jiraItems} />
                    </motion.div>
                )}

                {isComplete && (
                    <motion.div
                        className="mt-8 text-center"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.8 }}
                    >
                        <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                            All epics and tickets have been generated successfully!
                        </p>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default JiraTicketGenerator;
