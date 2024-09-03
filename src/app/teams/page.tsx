"use client";

import React, { useState, useEffect } from "react";
import { Octokit } from "@octokit/rest";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Users, Search, Plus, Edit2, Trash2, ArrowLeft, Github, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const octokit = new Octokit({ auth: process.env.NEXT_PUBLIC_GITHUB_TOKEN });

const TeamManagementPage = () => {
    const [teams, setTeams] = useState([]);
    const [newTeam, setNewTeam] = useState({ name: "", description: "" });
    const [repositories, setRepositories] = useState([]);
    const [searchRepo, setSearchRepo] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [editingTeam, setEditingTeam] = useState(null);
    const [teamToDelete, setTeamToDelete] = useState(null);

    useEffect(() => {
        fetchRepositories();
    }, []);

    const fetchRepositories = async () => {
        setIsLoading(true);
        try {
            const response = await octokit.repos.listForAuthenticatedUser();
            setRepositories(
                response.data.map((repo) => ({
                    id: repo.id.toString(),
                    name: repo.name,
                    description: repo.description,
                }))
            );
        } catch (error) {
            console.error("Error fetching repositories:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateTeam = () => {
        if (newTeam.name) {
            if (editingTeam) {
                setTeams(
                    teams.map((team) =>
                        team.id === editingTeam.id ? { ...team, ...newTeam } : team
                    )
                );
                setEditingTeam(null);
            } else {
                setTeams([...teams, { ...newTeam, id: Date.now().toString(), repositories: [] }]);
            }
            setNewTeam({ name: "", description: "" });
        }
    };

    const handleEditTeam = (team) => {
        setEditingTeam(team);
        setNewTeam({ name: team.name, description: team.description });
    };

    const handleDeleteTeam = (team) => {
        setTeamToDelete(team);
    };

    const confirmDeleteTeam = () => {
        if (teamToDelete) {
            const deletedTeam = teams.find((t) => t.id === teamToDelete.id);
            setRepositories((prevRepos) => [...prevRepos, ...deletedTeam.repositories]);
            setTeams(teams.filter((team) => team.id !== teamToDelete.id));
            setTeamToDelete(null);
        }
    };

    const onDragEnd = (result) => {
        const { source, destination } = result;

        if (!destination) return;

        if (source.droppableId === destination.droppableId) return;

        if (source.droppableId === "repo-list") {
            const teamId = destination.droppableId;
            const repoId = result.draggableId;
            const repo = repositories.find((r) => r.id === repoId);

            setTeams((prevTeams) =>
                prevTeams.map((team) =>
                    team.id === teamId
                        ? { ...team, repositories: [...team.repositories, repo] }
                        : team
                )
            );

            setRepositories((prevRepos) => prevRepos.filter((r) => r.id !== repoId));
        }
    };

    const filteredRepositories = repositories.filter((repo) =>
        repo.name.toLowerCase().includes(searchRepo.toLowerCase())
    );

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="min-h-screen bg-gray-50 py-8 px-6">
                <div className="max-w-7xl mx-auto">
                    <header className="flex items-center justify-between mb-8">
                        <h1 className="text-2xl font-semibold text-gray-800">Manage Teams</h1>
                        <Button variant="outline">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                        </Button>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <Card>
                            <CardHeader>
                                <h2 className="text-xl font-semibold text-gray-800">
                                    {editingTeam ? "Edit Team" : "Create New Team"}
                                </h2>
                            </CardHeader>
                            <CardContent>
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        handleCreateTeam();
                                    }}
                                    className="space-y-4"
                                >
                                    <div>
                                        <label
                                            htmlFor="teamName"
                                            className="block text-sm font-medium text-gray-700"
                                        >
                                            Team Name
                                        </label>
                                        <Input
                                            id="teamName"
                                            value={newTeam.name}
                                            onChange={(e) =>
                                                setNewTeam({ ...newTeam, name: e.target.value })
                                            }
                                            placeholder="Enter team name"
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <label
                                            htmlFor="teamDescription"
                                            className="block text-sm font-medium text-gray-700"
                                        >
                                            Description
                                        </label>
                                        <Input
                                            id="teamDescription"
                                            value={newTeam.description}
                                            onChange={(e) =>
                                                setNewTeam({
                                                    ...newTeam,
                                                    description: e.target.value,
                                                })
                                            }
                                            placeholder="Enter team description"
                                            className="mt-1"
                                        />
                                    </div>
                                    <Button type="submit" className="w-full">
                                        {editingTeam ? "Update Team" : "Create Team"}
                                    </Button>
                                    {editingTeam && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="w-full"
                                            onClick={() => {
                                                setEditingTeam(null);
                                                setNewTeam({ name: "", description: "" });
                                            }}
                                        >
                                            Cancel Edit
                                        </Button>
                                    )}
                                </form>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <h2 className="text-xl font-semibold text-gray-800">
                                    GitHub Repositories
                                </h2>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="relative">
                                        <Search
                                            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                            size={20}
                                        />
                                        <Input
                                            value={searchRepo}
                                            onChange={(e) => setSearchRepo(e.target.value)}
                                            placeholder="Search for a repository"
                                            className="pl-10"
                                        />
                                    </div>
                                    {isLoading ? (
                                        <p>Loading repositories...</p>
                                    ) : (
                                        <Droppable droppableId="repo-list">
                                            {(provided) => (
                                                <ul
                                                    {...provided.droppableProps}
                                                    ref={provided.innerRef}
                                                    className="space-y-2 max-h-96 overflow-y-auto"
                                                >
                                                    {filteredRepositories.map((repo, index) => (
                                                        <Draggable
                                                            key={repo.id}
                                                            draggableId={repo.id}
                                                            index={index}
                                                        >
                                                            {(provided) => (
                                                                <li
                                                                    ref={provided.innerRef}
                                                                    {...provided.draggableProps}
                                                                    {...provided.dragHandleProps}
                                                                    className="bg-white p-3 rounded-md shadow-sm flex items-center space-x-3 hover:bg-gray-50"
                                                                >
                                                                    <Github
                                                                        size={20}
                                                                        className="text-gray-500"
                                                                    />
                                                                    <div>
                                                                        <p className="font-medium text-gray-800">
                                                                            {repo.name}
                                                                        </p>
                                                                        <p className="text-sm text-gray-500">
                                                                            {repo.description}
                                                                        </p>
                                                                    </div>
                                                                </li>
                                                            )}
                                                        </Draggable>
                                                    ))}
                                                    {provided.placeholder}
                                                </ul>
                                            )}
                                        </Droppable>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold text-gray-800">Existing Teams</h2>
                            {teams.map((team) => (
                                <Droppable key={team.id} droppableId={team.id}>
                                    {(provided) => (
                                        <Card ref={provided.innerRef} {...provided.droppableProps}>
                                            <CardHeader>
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-lg font-semibold text-gray-800">
                                                        {team.name}
                                                    </h3>
                                                    <div className="flex space-x-2">
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            onClick={() => handleEditTeam(team)}
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            onClick={() => handleDeleteTeam(team)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-gray-600 mb-4">
                                                    {team.description}
                                                </p>
                                                <div className="flex items-center text-gray-600 mb-2">
                                                    <Users size={16} className="mr-2" />
                                                    <span>
                                                        {team.repositories.length} Repositories
                                                    </span>
                                                </div>
                                                <ul className="space-y-2 min-h-[50px]">
                                                    {team.repositories.map((repo, index) => (
                                                        <Draggable
                                                            key={repo.id}
                                                            draggableId={repo.id}
                                                            index={index}
                                                        >
                                                            {(provided) => (
                                                                <li
                                                                    ref={provided.innerRef}
                                                                    {...provided.draggableProps}
                                                                    {...provided.dragHandleProps}
                                                                    className="bg-gray-100 p-2 rounded-md text-sm text-gray-800"
                                                                >
                                                                    {repo.name}
                                                                </li>
                                                            )}
                                                        </Draggable>
                                                    ))}
                                                    {provided.placeholder}
                                                </ul>
                                            </CardContent>
                                        </Card>
                                    )}
                                </Droppable>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <AlertDialog open={!!teamToDelete} onOpenChange={() => setTeamToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Are you sure you want to delete this team?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. All repositories associated with this team
                            will be de-associated and returned to the main list.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteTeam}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </DragDropContext>
    );
};

export default TeamManagementPage;
