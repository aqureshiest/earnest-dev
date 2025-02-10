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
    ChevronDown,
    ChevronRight,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import AIModelSelection from "../../components/AIModelSelection";
import type { FeatureQuestion, FeatureQuestions, KeyFeature, PRDInput } from "@/types/prd";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MarkdownViewer from "../../components/MarkdownViewer";
import { LLM_MODELS } from "@/modules/utils/llmInfo";
import { defaultFeatureFlowPrompt } from "@/modules/prd/featureFlowPrompt";
import { toast } from "@/hooks/use-toast";
import FeatureQuestionsModal from "../../components/FeatureQuestionsModal";
import { loanConsolidationPRD, LocalLensPRD } from "../samples";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import PRDFeedbackView from "@/app/components/PRDFeedbackView";

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

    const [isRegenerating, setIsRegenerating] = useState(false);

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
                keyFeatures: features
                    .filter((f) => f.name || f.description)
                    .map(({ id, name, description, priority }) => ({
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
                keyFeatures: features
                    .filter((f) => f.name || f.description)
                    .map(({ id, name, description, priority, clarifyingQuestions }) => ({
                        id,
                        name,
                        description,
                        priority,
                        clarifyingQuestions,
                    })),
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

    // Add these handlers
    const handleRegenerateFull = async () => {
        console.log("Regenerate full PRD");
    };

    const handleRegenerateSection = async () => {
        console.log("Regenerate section");
    };

    const [isConfigOpen, setIsConfigOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 py-12 px-6">
            <div className="max-w-6xl mx-auto space-y-12">
                {/* Header */}
                <motion.div
                    className="text-center mb-12"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <Sparkles className="w-8 h-8 text-primary" />
                        <h1 className="text-4xl font-light">PRD Generator</h1>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
                        Transform your product vision into a comprehensive PRD with AI assistance
                    </p>
                </motion.div>

                {/* Input Section */}
                <div className="grid grid-cols-[1fr,320px] gap-8">
                    {/* Left Column - Form */}
                    <div className="space-y-8">
                        {/* Goal Statement */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                        >
                            <h2 className="text-xl font-medium flex items-center gap-2 bg-slate-100 p-4 rounded-md dark:bg-slate-800">
                                Goal Statement
                            </h2>
                            <Card className="overflow-hidden border-none shadow-lg">
                                <CardContent className="p-6">
                                    <Textarea
                                        value={goalStatement}
                                        onChange={(e) => setGoalStatement(e.target.value)}
                                        placeholder="Describe the core problem you're solving and your product vision..."
                                        className="border-none text-md placeholder:text-slate-400 resize-none bg-transparent"
                                        rows={4}
                                    />
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Features */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.4 }}
                        >
                            <div className="flex items-center justify-between bg-slate-100 p-4 rounded-md dark:bg-slate-800">
                                <h2 className="text-xl font-medium flex items-center gap-2">
                                    Key Features
                                </h2>
                                <Button variant="ghost" onClick={addFeature} className="gap-2">
                                    <Plus className="w-4 h-4" />
                                    Add Feature
                                </Button>
                            </div>

                            <div className="space-y-4">
                                {features.map((feature, index) => (
                                    <Card
                                        key={feature.id}
                                        className="border-none shadow-lg bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
                                    >
                                        <CardContent className="p-6 space-y-4">
                                            <div className="flex items-start gap-4">
                                                <div className="flex-1">
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
                                                        className="text-lg border-none bg-transparent"
                                                    />
                                                </div>
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
                                                    <SelectTrigger className="w-32">
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
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeFeature(feature.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>

                                            <Textarea
                                                placeholder="Describe this feature..."
                                                value={feature.description}
                                                onChange={(e) =>
                                                    handleFeatureChange(
                                                        feature.id,
                                                        "description",
                                                        e.target.value
                                                    )
                                                }
                                                className="border-none text-md placeholder:text-slate-400 resize-none bg-transparent"
                                                rows={3}
                                            />

                                            <input
                                                type="file"
                                                multiple
                                                onChange={(e) =>
                                                    handleFeatureFileChange(
                                                        feature.id,
                                                        e.target.files
                                                    )
                                                }
                                                className="text-sm file:mr-4 file:py-2 file:px-4
                                 file:rounded-full file:border-0
                                 file:text-sm file:font-semibold
                                 file:bg-primary/10 file:text-primary
                                 hover:file:bg-primary/20"
                                            />
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            {/* Target Audience & Constraints */}
                            <h2 className="text-xl font-medium flex items-center gap-2 bg-slate-100 p-4 rounded-md dark:bg-slate-800 mt-8">
                                Target Audience & Constraints
                            </h2>
                            <Card className="border-none shadow-lg">
                                <CardContent className="p-6">
                                    <div className="grid grid-cols-2 gap-8">
                                        {/* Target Audience */}
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-sm font-medium">
                                                    Target Audience
                                                </Label>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={addAudienceField}
                                                >
                                                    <Plus className="w-4 h-4 mr-2" />
                                                    Add
                                                </Button>
                                            </div>
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
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => removeAudienceField(index)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Constraints */}
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-sm font-medium">
                                                    Constraints
                                                </Label>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={addConstraintField}
                                                >
                                                    <Plus className="w-4 h-4 mr-2" />
                                                    Add
                                                </Button>
                                            </div>
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
                                                        placeholder="Add constraint..."
                                                        className="flex-1"
                                                    />
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => removeConstraintField(index)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>

                    {/* Right Column - Configuration Panel */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: 0.8 }}
                    >
                        <Card className="border-none shadow-lg sticky top-8">
                            <CardContent className="p-6 space-y-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-2">
                                        <Settings2 className="w-5 h-5 text-primary" />
                                        <h3 className="text-lg font-medium">Configuration</h3>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setCustomPromptSys(defaultFeatureFlowPrompt.system);
                                            setCustomPromptUser(defaultFeatureFlowPrompt.user);
                                        }}
                                    >
                                        Reset Defaults
                                    </Button>
                                </div>

                                {/* Model Selection */}
                                <div className="space-y-2">
                                    <AIModelSelection
                                        selectedModel={selectedModel}
                                        setSelectedModel={setSelectedModel}
                                        recommendedModel={LLM_MODELS.OPENAI_GPT_4O}
                                        loading={isGenerating}
                                    />
                                </div>

                                {/* Prompts */}
                                <Collapsible>
                                    <CollapsibleTrigger className="flex items-center justify-between w-full">
                                        <Label>Advanced Configuration</Label>
                                        {isConfigOpen ? (
                                            <ChevronDown className="w-4 h-4" />
                                        ) : (
                                            <ChevronRight className="w-4 h-4" />
                                        )}
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="space-y-4 mt-4">
                                        <div className="space-y-2">
                                            <Label>System Prompt</Label>
                                            <Textarea
                                                value={customPromptSys}
                                                onChange={(e) => setCustomPromptSys(e.target.value)}
                                                rows={6}
                                                className="resize-none"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Feature Flow Prompt</Label>
                                            <Textarea
                                                value={customPromptUser}
                                                onChange={(e) =>
                                                    setCustomPromptUser(e.target.value)
                                                }
                                                rows={20}
                                                className="resize-none"
                                            />
                                        </div>
                                    </CollapsibleContent>
                                </Collapsible>

                                {/* Generate Button */}
                                <Button
                                    onClick={handleGenerateQuestions}
                                    disabled={
                                        isGeneratingQuestions ||
                                        isGenerating ||
                                        !selectedModel ||
                                        !goalStatement
                                    }
                                    className="w-full"
                                >
                                    {isGeneratingQuestions ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Analyzing...
                                        </>
                                    ) : (
                                        <>
                                            <MessageSquare className="mr-2 h-4 w-4" />
                                            Generate PRD
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>

                {/* Output Section */}
                <AnimatePresence>
                    {(isGenerating ||
                        generatedContent ||
                        Object.keys(featureAnalyses).length > 0) && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="border-t border-slate-200 dark:border-slate-800 pt-8"
                        >
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                <TabsList className="w-full bg-slate-100 dark:bg-slate-800/50 mb-6">
                                    <TabsTrigger
                                        value="progress"
                                        className="flex-1 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800"
                                    >
                                        Generation Progress
                                    </TabsTrigger>
                                    {Object.values(featureAnalyses).length > 0 && (
                                        <TabsTrigger
                                            value="features"
                                            className="flex-1 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800"
                                        >
                                            Feature Analysis
                                        </TabsTrigger>
                                    )}
                                    {generatedContent && (
                                        <TabsTrigger
                                            value="final"
                                            className="flex-1 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800"
                                        >
                                            Final PRD
                                        </TabsTrigger>
                                    )}
                                </TabsList>

                                {/* Progress Tab */}
                                <TabsContent value="progress" className="mt-0">
                                    <Card className="border-none shadow-lg overflow-hidden">
                                        <CardContent className="p-6">
                                            {isGenerating ? (
                                                <div className="flex items-center gap-3 mb-4 text-primary">
                                                    <Loader2 className="h-5 w-5 animate-spin" />
                                                    <h3 className="font-medium">
                                                        Generating PRD...
                                                    </h3>
                                                </div>
                                            ) : (
                                                <h3 className="font-medium mb-4">
                                                    Generation Complete
                                                </h3>
                                            )}

                                            <div className="space-y-4">
                                                {progress.map((message, index) => (
                                                    <motion.div
                                                        key={index}
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        className="flex items-start gap-3 text-sm"
                                                    >
                                                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                                                            <CheckCircle2 className="h-3 w-3 text-primary" />
                                                        </div>
                                                        <span className="text-slate-600 dark:text-slate-300">
                                                            {message}
                                                        </span>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                {/* Feature Analysis Tab */}
                                {Object.values(featureAnalyses).length > 0 && (
                                    <TabsContent value="features">
                                        {Object.values(featureAnalyses).map((feature, index) => (
                                            <div className="prose dark:prose-invert max-w-none">
                                                <div className="p-4 bg-white dark:bg-slate-900 rounded-lg">
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                                                            {index + 1}
                                                        </span>
                                                        <h4 className="text-lg font-medium">
                                                            {feature.featureName}
                                                        </h4>
                                                    </div>
                                                    <div className="prose dark:prose-invert max-w-none">
                                                        <MarkdownViewer
                                                            content={feature.analysis}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </TabsContent>
                                )}

                                {/* Final PRD Tab */}
                                {generatedContent && (
                                    <TabsContent value="final">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2">
                                                {isRegenerating && (
                                                    <div className="flex items-center gap-2 text-primary">
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                        <span>Regenerating...</span>
                                                    </div>
                                                )}
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleCopy}
                                                className="gap-2"
                                            >
                                                {copied ? (
                                                    <>
                                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                        Copied!
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="h-4 w-4" />
                                                        Copy Markdown
                                                    </>
                                                )}
                                            </Button>
                                        </div>

                                        <PRDFeedbackView
                                            content={generatedContent}
                                            // onRegenerateFull={handleRegenerateFull}
                                            onRegenerateSection={handleRegenerateSection}
                                            isRegenerating={isRegenerating}
                                        />
                                    </TabsContent>
                                )}
                            </Tabs>
                        </motion.div>
                    )}
                </AnimatePresence>
                {/* Feature Questions Modal */}
                <FeatureQuestionsModal
                    isOpen={showQuestionsModal}
                    onClose={() => setShowQuestionsModal(false)}
                    features={featureQuestions}
                    onComplete={handleFeatureResponsesComplete}
                    isLoading={isGenerating}
                />
            </div>
        </div>
    );
};

export default PRDGenerator;
