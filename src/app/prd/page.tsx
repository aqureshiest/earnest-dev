"use client";

import React, { useEffect, useState } from "react";
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
import {
    Loader2,
    FileText,
    Plus,
    Trash2,
    Upload,
    CheckCircle2,
    Copy,
    Settings2,
    MessageSquare,
    Sparkle,
    Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import AIModelSelection from "../components/AIModelSelection";
import type { FeatureQuestion, FeatureQuestions, KeyFeature, PRDInput } from "@/types/prd";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MarkdownViewer from "../components/MarkdownViewer";
import { LLM_MODELS } from "@/modules/utils/llmInfo";
import { defaultFeatureFlowPrompt } from "@/modules/prd/featureFlowPrompt";
import { toast } from "@/hooks/use-toast";
import FeatureQuestionsModal from "../components/FeatureQuestionsModal";
import { loanConsolidationPRD, LocalLensPRD } from "./samples";

// Types
type FeatureAnalysis = {
    featureId: string;
    featureName: string;
    analysis: string;
};

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
    const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);

    const [progress, setProgress] = useState<string[]>([]);
    const [generatedContent, setGeneratedContent] = useState<string>("");
    const [featureAnalyses, setFeatureAnalyses] = useState<Record<string, FeatureAnalysis>>({});
    const [activeTab, setActiveTab] = useState<string>("progress");

    const [customPromptSys, setCustomPromptSys] = useState(defaultFeatureFlowPrompt.system);
    const [customPromptUser, setCustomPromptUser] = useState(defaultFeatureFlowPrompt.user);

    const [showQuestionsModal, setShowQuestionsModal] = useState(false);
    const [featureQuestions, setFeatureQuestions] = useState<FeatureQuestions[]>([]);

    useEffect(() => {
        if (!goalStatement) {
            handleLoadSample();
        }
    }, [goalStatement]);

    const handleLoadSample = () => {
        const inputPRD = loanConsolidationPRD;
        setGoalStatement(inputPRD.goalStatement);
        setTargetAudience(inputPRD.targetAudience);
        setFeatures(
            inputPRD.keyFeatures.map((feature) => ({
                ...feature,
                id: crypto.randomUUID(),
                files: [],
            }))
        );
        setConstraints(inputPRD.constraints);
    };

    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(generatedContent);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

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

    // Generate questions for features
    const handleGenerateQuestions = async () => {
        setIsGeneratingQuestions(true);
        try {
            const formData = new FormData();
            const input: PRDInput = {
                goalStatement,
                targetAudience: targetAudience.filter(Boolean),
                constraints: constraints.filter(Boolean),
                keyFeatures: features.map(({ id, name, description, priority }) => ({
                    id,
                    name,
                    description,
                    priority,
                })),
            };

            formData.append("input", JSON.stringify(input));
            formData.append("model", selectedModel);

            const response = await fetch("/api/prd/generate-questions", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Failed to generate questions: ${response.statusText}`);
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            while (reader) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split("\n");

                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        const event = JSON.parse(line.slice(6));

                        if (event.type === "complete") {
                            setFeatureQuestions(event.message.questions);
                            console.log("Generated questions:", event.message.questions);
                            setShowQuestionsModal(true);
                        }
                    }
                }
            }
        } catch (error: any) {
            console.error("Error generating questions:", error);
            toast({
                title: "Error",
                description: `Failed to generate questions: ${error.message}`,
                variant: "destructive",
            });
        } finally {
            setIsGeneratingQuestions(false);
        }
    };

    // Handle feature responses and generate PRD
    const formatQuestionsAndAnswers = (questions: FeatureQuestion[]): string => {
        return questions
            .filter((q) => q.answer.length > 0) // Filter out questions without answers
            .map((q) => {
                const selectedChoices = q.choices
                    .filter((c) => q.answer.includes(c.id))
                    .map((c) => c.text);

                const answerText =
                    q.type === "multiple" ? selectedChoices.join(", ") : selectedChoices[0] || "";

                return `Q: ${q.question}\nA: ${answerText}`;
            })
            .join("\n\n");
    };

    const handleFeatureResponsesComplete = async (responses: FeatureQuestions[]) => {
        // Update features with clarifying questions text
        const featuresWithResponses = features.map((feature) => {
            const featureResponses = responses.find((r) => r.featureId === feature.id);
            if (!featureResponses) return feature;

            return {
                ...feature,
                clarifyingQuestions: formatQuestionsAndAnswers(featureResponses.questions),
            };
        });

        setShowQuestionsModal(false);
        await handleGeneratePRD(featuresWithResponses);
    };

    // Updated PRD generation function
    const handleGeneratePRD = async (features: FeatureInput[]) => {
        setIsGenerating(true);
        setProgress([]);
        setGeneratedContent("");
        setFeatureAnalyses({});
        setActiveTab("progress");

        try {
            const formData = new FormData();

            // Add basic PRD data
            const prdInput = {
                goalStatement,
                targetAudience: targetAudience.filter(Boolean),
                constraints: constraints.filter(Boolean),
                keyFeatures: features.map(
                    ({ id, name, description, priority, clarifyingQuestions }) => ({
                        id,
                        name,
                        description,
                        priority,
                        clarifyingQuestions,
                    })
                ),
            };

            formData.append("input", JSON.stringify(prdInput));
            formData.append("model", selectedModel);
            formData.append("customPromptSys", customPromptSys);
            formData.append("customPromptUser", customPromptUser);

            // Add files with feature ID in the field name
            features.forEach((feature) => {
                feature.files.forEach((file) => {
                    formData.append(`file_${feature.id}`, file);
                });
            });

            const response = await fetch("/api/prd/generate-prd", {
                method: "POST",
                body: formData,
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
                        const event = JSON.parse(line.slice(6));

                        switch (event.type) {
                            case "complete":
                                setGeneratedContent(event.message.content);
                                setActiveTab("final");
                                break;

                            case "feature_screens_analysis":
                                setFeatureAnalyses((prev) => ({
                                    ...prev,
                                    [event.message.featureName]: event.message,
                                }));
                                break;

                            case "final":
                                setProgress((prev) => [...prev, event.message]);
                                setIsGenerating(false);
                                break;

                            default:
                                setProgress((prev) => [...prev, event.message]);
                                break;
                        }
                    }
                }
            }
        } catch (error: any) {
            console.error("Error generating PRD:", error);
            setProgress((prev) => [...prev, `Error: ${error.message}`]);
            toast({
                title: "Error",
                description: `Failed to generate PRD: ${error.message}`,
                variant: "destructive",
            });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="min-h-screen py-8 px-6">
            <motion.h1
                className="text-3xl font-semibold text-center mb-8"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="flex items-center gap-2 justify-center">
                    <Sparkles className="w-6 h-6 text-primary" />
                    PRD Generator
                </div>
            </motion.h1>

            <div className="max-w-7xl mx-auto mb-10">
                <div className="grid grid-cols-3 gap-4">
                    {/* Main Form Content */}
                    <div className="col-span-2 space-y-6">
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

                        {/* Updated Generate PRD Button */}
                        <Button
                            onClick={handleGenerateQuestions}
                            className="w-full"
                            disabled={
                                isGeneratingQuestions ||
                                isGenerating ||
                                !selectedModel ||
                                !goalStatement
                            }
                        >
                            {isGeneratingQuestions ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Generating Questions...
                                </>
                            ) : (
                                <>
                                    <MessageSquare className="mr-2 h-4 w-4" />
                                    Generate PRD
                                </>
                            )}
                        </Button>

                        {/* Feature Questions Modal */}
                        <FeatureQuestionsModal
                            isOpen={showQuestionsModal}
                            onClose={() => setShowQuestionsModal(false)}
                            features={featureQuestions}
                            onComplete={handleFeatureResponsesComplete}
                            isLoading={isGenerating}
                        />
                    </div>

                    {/* Configuration Panel Column */}
                    <div className="w-full">
                        <Card className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-md">
                            <CardHeader className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-800/80 rounded-t-lg">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Settings2 className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                                        <CardTitle className="dark:text-slate-200">
                                            Configuration Panel
                                        </CardTitle>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setCustomPromptSys(defaultFeatureFlowPrompt.system);
                                            setCustomPromptUser(defaultFeatureFlowPrompt.user);
                                        }}
                                        className="dark:border-slate-700 dark:hover:bg-slate-800 dark:text-slate-300"
                                    >
                                        <span className="mr-2">↺</span>
                                        Reset to Defaults
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6 p-6">
                                {/* System Prompt */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium flex items-center gap-2 dark:text-slate-300">
                                        <span className="inline-block w-2 h-2 bg-blue-400 dark:bg-blue-500 rounded-full"></span>
                                        System Prompt
                                    </Label>
                                    <Textarea
                                        value={customPromptSys}
                                        onChange={(e) => setCustomPromptSys(e.target.value)}
                                        placeholder="Enter system prompt for the AI model"
                                        rows={6}
                                        className="resize-none bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 dark:text-slate-200 dark:placeholder:text-slate-400"
                                    />
                                </div>

                                {/* User Prompt */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium flex items-center gap-2 dark:text-slate-300">
                                        <span className="inline-block w-2 h-2 bg-green-400 dark:bg-green-500 rounded-full"></span>
                                        Feature Flow Prompt
                                    </Label>
                                    <Textarea
                                        value={customPromptUser}
                                        onChange={(e) => setCustomPromptUser(e.target.value)}
                                        placeholder="Enter custom prompt for feature flow generation"
                                        rows={15}
                                        className="resize-none bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 dark:text-slate-200 dark:placeholder:text-slate-400"
                                    />
                                </div>

                                {/* AI Model */}
                                <div className="space-y-2">
                                    <AIModelSelection
                                        selectedModel={selectedModel}
                                        setSelectedModel={setSelectedModel}
                                        loading={isGenerating}
                                        recommendedModel={LLM_MODELS.OPENAI_GPT_4O}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Results Section */}
            <div className="max-w-7xl mx-auto mb-10">
                <Card className="mt-6 dark:bg-slate-900/50 dark:border-slate-800">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="dark:text-slate-200">Analysis Results</CardTitle>
                            {isGenerating && (
                                <div className="flex items-center text-sm text-muted-foreground">
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Generating...
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="w-full bg-slate-100 dark:bg-slate-800">
                                <TabsTrigger
                                    value="progress"
                                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 dark:text-slate-300 dark:data-[state=active]:text-slate-100"
                                >
                                    Progress
                                </TabsTrigger>
                                {Object.values(featureAnalyses).map((feature) => (
                                    <TabsTrigger
                                        key={feature.featureId}
                                        value={feature.featureId}
                                        className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 dark:text-slate-300 dark:data-[state=active]:text-slate-100"
                                    >
                                        {feature.featureName}
                                    </TabsTrigger>
                                ))}
                                {generatedContent && (
                                    <TabsTrigger
                                        value="final"
                                        className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 dark:text-slate-300 dark:data-[state=active]:text-slate-100"
                                    >
                                        Final PRD
                                    </TabsTrigger>
                                )}
                            </TabsList>

                            <TabsContent value="progress">
                                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                                    {progress.map((message, index) => (
                                        <div
                                            key={index}
                                            className="text-sm p-2 rounded-md bg-slate-50 dark:bg-slate-800/50 dark:text-slate-300"
                                        >
                                            {message}
                                        </div>
                                    ))}
                                </div>
                            </TabsContent>

                            {Object.values(featureAnalyses).map((feature) => (
                                <TabsContent key={feature.featureId} value={feature.featureId}>
                                    <div className="prose dark:prose-invert max-w-none">
                                        <div className="p-4 bg-white dark:bg-slate-900 rounded-lg">
                                            <MarkdownViewer content={feature.analysis} />
                                        </div>
                                    </div>
                                </TabsContent>
                            ))}

                            {generatedContent && (
                                <TabsContent value="final">
                                    <div className="flex items-center justify-end mb-4">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleCopy}
                                            className="gap-2 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 dark:text-slate-300"
                                        >
                                            {copied ? (
                                                <>
                                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                    <span className="dark:text-slate-200">
                                                        Copied!
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="h-4 w-4" />
                                                    <span className="dark:text-slate-200">
                                                        Copy Markdown
                                                    </span>
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                    <div className="prose dark:prose-invert max-w-none">
                                        <div className="p-4 bg-white dark:bg-slate-900 rounded-lg">
                                            <MarkdownViewer content={generatedContent} />
                                        </div>
                                    </div>
                                </TabsContent>
                            )}
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default PRDGenerator;
