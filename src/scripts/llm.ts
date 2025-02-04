import { AIServiceFactory } from "@/modules/ai/clients/AIServiceFactory";
import { LLM_MODELS } from "@/modules/utils/llmInfo";

export const llm = async () => {
    const aiService = AIServiceFactory.createAIService(LLM_MODELS.OPENAI_GPT_4O.id);

    const systemPrompt = "You are an amazing UI designer.";
    const userPrompt = `Can you please review this code and come up with a nice modern UI that helps the user provide this information in an easy manner. Understand the data elements and then come up with the UI design.

Please update the following code based on the UI design you come up with:


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
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

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

            // Handle file uploads first
            for (const feature of features) {
                if (feature.files.length > 0) {
                    setProgress((prev) => [
                        ...prev,
                        Uploading files for feature: \${feature.name}...,
                    ]);
                    // Upload logic here
                }
            }

            const response = await fetch("/api/generate-prd", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    input: prdInput,
                    model: selectedModel,
                }),
            });

            if (!response.ok) {
                throw new Error(Failed to generate PRD: \${response.statusText});
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
            setProgress((prev) => [...prev, Error: \${error.message}]);
        } finally {
            setIsGenerating(false);
        }
    };

    const [activeSection, setActiveSection] = useState<string>("goal");
    const [preview, setPreview] = useState<boolean>(false);

    return (
        <div className="min-h-screen">
            <div className="max-w-5xl mx-auto p-6">
                {/* Header with model selection and generate button */}
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl font-semibold">Create Product Requirements Document</h1>
                    <div className="flex items-center gap-4">
                        <AIModelSelection
                            selectedModel={selectedModel}
                            setSelectedModel={setSelectedModel}
                            loading={isGenerating}
                        />
                        <Button
                            onClick={handleGeneratePRD}
                            disabled={isGenerating || !selectedModel || !goalStatement}
                            className="w-32"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Working...
                                </>
                            ) : (
                                "Generate PRD"
                            )}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-6">
                    {/* Main content area */}
                    <div className="col-span-5">
                        <Card>
                            <CardContent className="p-6">
                                {/* Goal Statement - Always visible */}
                                <div className="mb-8">
                                    <Label
                                        htmlFor="goalStatement"
                                        className="text-lg font-semibold"
                                    >
                                        What problem are we solving?
                                    </Label>
                                    <Textarea
                                        id="goalStatement"
                                        value={goalStatement}
                                        onChange={(e) => setGoalStatement(e.target.value)}
                                        placeholder="Describe the main problem or goal this product will address..."
                                        className="mt-2 h-24"
                                    />
                                </div>

                                {/* Sections in Accordion */}
                                <Accordion
                                    type="single"
                                    defaultValue="audience"
                                    className="space-y-4"
                                >
                                    {/* Target Audience Section */}
                                    <AccordionItem value="audience" className="border rounded-lg">
                                        <AccordionTrigger className="px-4 hover:no-underline">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold">
                                                    Target Audience
                                                </span>
                                                <Badge variant="secondary">
                                                    {targetAudience.filter(Boolean).length}
                                                </Badge>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="px-4 pt-2 pb-4">
                                            <div className="space-y-3">
                                                {targetAudience.map((audience, index) => (
                                                    <div
                                                        key={index}
                                                        className="flex gap-2 items-center"
                                                    >
                                                        <Input
                                                            value={audience}
                                                            onChange={(e) =>
                                                                handleAudienceChange(
                                                                    index,
                                                                    e.target.value
                                                                )
                                                            }
                                                            placeholder="Who will use this product?"
                                                            className="flex-1"
                                                        />
                                                        {targetAudience.length > 1 && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() =>
                                                                    removeAudienceField(index)
                                                                }
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                ))}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={addAudienceField}
                                                    className="mt-2"
                                                >
                                                    <Plus className="h-4 w-4 mr-2" />
                                                    Add Audience
                                                </Button>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>

                                    {/* Key Features Section */}
                                    <AccordionItem value="features" className="border rounded-lg">
                                        <AccordionTrigger className="px-4 hover:no-underline">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold">Key Features</span>
                                                <Badge variant="secondary">{features.length}</Badge>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="px-4 pt-2 pb-4">
                                            <div className="space-y-4">
                                                {features.map((feature) => (
                                                    <Card key={feature.id} className="relative">
                                                        <CardContent className="p-4 grid grid-cols-6 gap-4">
                                                            <div className="col-span-6 sm:col-span-4">
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
                                                                    className="mb-2"
                                                                />
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
                                                                    rows={2}
                                                                />
                                                            </div>
                                                            <div className="col-span-6 sm:col-span-2">
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
                                                                        <SelectItem value="high">
                                                                            High
                                                                        </SelectItem>
                                                                        <SelectItem value="medium">
                                                                            Medium
                                                                        </SelectItem>
                                                                        <SelectItem value="low">
                                                                            Low
                                                                        </SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                                <div className="mt-2">
                                                                    <Label className="text-sm">
                                                                        Figma Screens
                                                                    </Label>
                                                                    <div className="mt-1 flex items-center gap-2">
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            className="w-full"
                                                                            onClick={() =>
                                                                                document
                                                                                    .getElementById(
                                                                                        file-\${feature.id}
                                                                                    )
                                                                                    ?.click()
                                                                            }
                                                                        >
                                                                            <Upload className="h-4 w-4 mr-2" />
                                                                            Upload
                                                                        </Button>
                                                                        <input
                                                                            id={file-\${feature.id}}
                                                                            type="file"
                                                                            multiple
                                                                            className="hidden"
                                                                            onChange={(e) =>
                                                                                handleFeatureFileChange(
                                                                                    feature.id,
                                                                                    e.target.files
                                                                                )
                                                                            }
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {features.length > 1 && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() =>
                                                                        removeFeature(feature.id)
                                                                    }
                                                                    className="absolute top-2 right-2"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                                <Button
                                                    variant="outline"
                                                    onClick={addFeature}
                                                    className="w-full"
                                                >
                                                    <Plus className="h-4 w-4 mr-2" />
                                                    Add Feature
                                                </Button>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>

                                    {/* Constraints Section */}
                                    <AccordionItem
                                        value="constraints"
                                        className="border rounded-lg"
                                    >
                                        <AccordionTrigger className="px-4 hover:no-underline">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold">Constraints</span>
                                                <Badge variant="secondary">
                                                    {constraints.filter(Boolean).length}
                                                </Badge>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="px-4 pt-2 pb-4">
                                            <div className="space-y-3">
                                                {constraints.map((constraint, index) => (
                                                    <div
                                                        key={index}
                                                        className="flex gap-2 items-center"
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
                                                        {constraints.length > 1 && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() =>
                                                                    removeConstraintField(index)
                                                                }
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                ))}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={addConstraintField}
                                                    className="mt-2"
                                                >
                                                    <Plus className="h-4 w-4 mr-2" />
                                                    Add Constraint
                                                </Button>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Progress sidebar */}
                    <div className="col-span-2">
                        <div className="sticky top-6">
                            <Card>
                                <CardContent className="p-4">
                                    <h3 className="font-medium mb-3">Progress</h3>
                                    <ScrollArea className="h-[calc(100vh-200px)]">
                                        <div className="space-y-2 pr-4">
                                            {progress.map((message, index) => (
                                                <div
                                                    key={index}
                                                    className="text-sm p-2 rounded-md bg-slate-50 dark:bg-slate-900"
                                                >
                                                    {message}
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PRDGenerator;
`;

    const response = await aiService.generateResponse(systemPrompt, userPrompt);
    console.log(response.response);
};
