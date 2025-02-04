"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, FileText, Plus, Trash2, Upload } from "lucide-react";
import { motion } from "framer-motion";
import AIModelSelection from "../components/AIModelSelection";
import type { KeyFeature, PRDInput } from "@/types/prd";

interface FeatureInput extends Omit<KeyFeature, "id"> {
    id: string;
    files: File[];
}

const PRDGenerator: React.FC = () => {
    const [goalStatement, setGoalStatement] = useState("");
    const [targetAudience, setTargetAudience] = useState<string[]>([""]);
    const [constraints, setConstraints] = useState<string[]>([""]);
    const [features, setFeatures] = useState<FeatureInput[]>([
        {
            id: crypto.randomUUID(),
            name: "",
            description: "",
            priority: "medium",
            files: [],
        },
    ]);
    const [selectedModel, setSelectedModel] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState<string[]>([]);

    const handleAudienceChange = (index: number, value: string) => {
        const newAudience = [...targetAudience];
        newAudience[index] = value;
        setTargetAudience(newAudience);
    };

    const handleConstraintChange = (index: number, value: string) => {
        const newConstraints = [...constraints];
        newConstraints[index] = value;
        setConstraints(newConstraints);
    };

    const addAudienceField = () => {
        setTargetAudience([...targetAudience, ""]);
    };

    const addConstraintField = () => {
        setConstraints([...constraints, ""]);
    };

    const removeAudienceField = (index: number) => {
        const newAudience = targetAudience.filter((_, i) => i !== index);
        setTargetAudience(newAudience);
    };

    const removeConstraintField = (index: number) => {
        const newConstraints = constraints.filter((_, i) => i !== index);
        setConstraints(newConstraints);
    };

    const handleFeatureChange = (id: string, field: keyof FeatureInput, value: any) => {
        setFeatures(
            features.map((feature) =>
                feature.id === id ? { ...feature, [field]: value } : feature
            )
        );
    };

    const handleFeatureFileChange = (id: string, files: FileList | null) => {
        if (!files) return;

        setFeatures(
            features.map((feature) =>
                feature.id === id
                    ? {
                          ...feature,
                          files: [...feature.files, ...Array.from(files)],
                      }
                    : feature
            )
        );
    };

    const addFeature = () => {
        setFeatures([
            ...features,
            {
                id: crypto.randomUUID(),
                name: "",
                description: "",
                priority: "medium",
                files: [],
            },
        ]);
    };

    const removeFeature = (id: string) => {
        setFeatures(features.filter((feature) => feature.id !== id));
    };

    const handleGeneratePRD = async () => {
        setIsGenerating(true);
        setProgress([]);

        try {
            const prdInput: PRDInput = {
                goalStatement,
                targetAudience: targetAudience.filter(Boolean),
                constraints: constraints.filter(Boolean),
                keyFeatures: features.map(({ id, name, description, priority }) => ({
                    id,
                    name,
                    description,
                    priority: priority as "high" | "medium" | "low",
                })),
            };

            const response = await fetch("/api/generate-prd", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    input: prdInput,
                    model: selectedModel,
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to generate PRD: ${response.statusText}`);
            }

            // Handle streaming response
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            while (reader) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split("\n");

                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        const data = JSON.parse(line.slice(6));
                        setProgress((prev) => [...prev, data.message]);
                    }
                }
            }
        } catch (error: any) {
            console.error("Error generating PRD:", error);
            setProgress((prev) => [...prev, `Error: ${error.message}`]);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="min-h-screen py-8 px-6">
            <div className="max-w-3xl mx-auto">
                <motion.h1
                    className="text-3xl font-semibold text-center mb-8"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    PRD Generator
                </motion.h1>

                <div className="">
                    {/* Main Form Content */}
                    <div className="space-y-6">
                        {/* Goal Statement Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Goal Statement</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Textarea
                                    id="goalStatement"
                                    value={goalStatement}
                                    onChange={(e) => setGoalStatement(e.target.value)}
                                    placeholder="What problem are we solving?"
                                    rows={5}
                                />
                            </CardContent>
                        </Card>

                        {/* Features Card */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                                <CardTitle>Key Features</CardTitle>
                                <Button variant="outline" size="sm" onClick={addFeature}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Feature
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {features.map((feature, index) => (
                                    <div
                                        key={feature.id}
                                        className="border rounded-lg p-4 space-y-4"
                                    >
                                        {/* Name and Delete */}
                                        <div className="grid grid-cols-[1fr,auto] gap-2">
                                            <Input
                                                placeholder="Feature name"
                                                value={feature.name}
                                                onChange={(e) =>
                                                    handleFeatureChange(
                                                        feature.id,
                                                        "name",
                                                        e.target.value
                                                    )
                                                }
                                            />
                                            <div className="w-9">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeFeature(feature.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Description */}
                                        <Textarea
                                            placeholder="Feature description"
                                            value={feature.description}
                                            onChange={(e) =>
                                                handleFeatureChange(
                                                    feature.id,
                                                    "description",
                                                    e.target.value
                                                )
                                            }
                                            rows={3}
                                        />

                                        {/* Priority and Files in one row */}
                                        <div className="flex items-start gap-4">
                                            <div className="w-40">
                                                <Select
                                                    value={feature.priority}
                                                    onValueChange={(value) =>
                                                        handleFeatureChange(
                                                            feature.id,
                                                            "priority",
                                                            value
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Priority" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="high">High</SelectItem>
                                                        <SelectItem value="medium">
                                                            Medium
                                                        </SelectItem>
                                                        <SelectItem value="low">Low</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="flex-1">
                                                <input
                                                    type="file"
                                                    multiple
                                                    onChange={(e) =>
                                                        handleFeatureFileChange(
                                                            feature.id,
                                                            e.target.files
                                                        )
                                                    }
                                                    className="w-full text-sm file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-violet-50 file:text-violet-700
                                hover:file:bg-violet-100"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Target Audience & Constraints Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Target Audience & Constraints</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-8">
                                    {/* Target Audience column */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-sm font-medium">
                                                Target Audience
                                            </Label>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={addAudienceField}
                                            >
                                                <Plus className="h-4 w-4 mr-2" />
                                                Add Audience
                                            </Button>
                                        </div>
                                        <div className="space-y-2">
                                            {targetAudience.map((audience, index) => (
                                                <div
                                                    key={index}
                                                    className="flex items-center gap-2"
                                                >
                                                    <Input
                                                        value={audience}
                                                        onChange={(e) =>
                                                            handleAudienceChange(
                                                                index,
                                                                e.target.value
                                                            )
                                                        }
                                                        placeholder="Who is this for?"
                                                        className="flex-1"
                                                    />
                                                    <div className="w-9">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() =>
                                                                removeAudienceField(index)
                                                            }
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Constraints column */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-sm font-medium">
                                                Constraints
                                            </Label>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={addConstraintField}
                                            >
                                                <Plus className="h-4 w-4 mr-2" />
                                                Add Constraint
                                            </Button>
                                        </div>
                                        <div className="space-y-2">
                                            {constraints.map((constraint, index) => (
                                                <div
                                                    key={index}
                                                    className="flex items-center gap-2"
                                                >
                                                    <Input
                                                        value={constraint}
                                                        onChange={(e) =>
                                                            handleConstraintChange(
                                                                index,
                                                                e.target.value
                                                            )
                                                        }
                                                        placeholder="Add technical, business, or resource constraint"
                                                        className="flex-1"
                                                    />
                                                    <div className="w-9">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() =>
                                                                removeConstraintField(index)
                                                            }
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Generation Controls Card */}
                        <Card>
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    <AIModelSelection
                                        selectedModel={selectedModel}
                                        setSelectedModel={setSelectedModel}
                                        loading={isGenerating}
                                    />
                                    <Button
                                        onClick={handleGeneratePRD}
                                        className="w-full"
                                        disabled={isGenerating || !selectedModel || !goalStatement}
                                    >
                                        {isGenerating ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Generating...
                                            </>
                                        ) : (
                                            <>
                                                <FileText className="mr-2 h-4 w-4" />
                                                Generate PRD
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Progress Feed Sidebar */}
                    <div className="mt-12">
                        <Card>
                            <CardHeader>
                                <CardTitle>Progress</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                                    {progress.map((message, index) => (
                                        <div
                                            key={index}
                                            className="text-sm p-2 rounded-md bg-slate-50 dark:bg-slate-900"
                                        >
                                            {message}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PRDGenerator;
