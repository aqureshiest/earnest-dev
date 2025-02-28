import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { LLM_MODELS } from "@/modules/utils/llmInfo";
import { useEffect } from "react";

interface Props {
    selectedModel: string;
    setSelectedModel: (model: string) => void;
    loading: boolean;
    recommendedModel?: (typeof LLM_MODELS)[keyof typeof LLM_MODELS];
}

const AIModelSelection = ({
    selectedModel,
    setSelectedModel,
    loading,
    recommendedModel = LLM_MODELS.ANTHROPIC_CLAUDE_3_5_HAIKU_NEW,
}: Props) => {
    // Group models by company
    const getGroupedModels = () => {
        const models = Object.entries(LLM_MODELS)
            .filter(([_, value]) => !("deprecated" in value) || !value.deprecated)
            .map(([key, value]) => ({
                label: value.name,
                value: value.id,
                company: getCompanyFromName(value.name),
            }));

        // Group by company
        const grouped = models.reduce((acc, model) => {
            if (!acc[model.company]) {
                acc[model.company] = [];
            }
            acc[model.company].push(model);
            return acc;
        }, {} as Record<string, typeof models>);

        return grouped;
    };

    // Helper to extract company name from model name
    const getCompanyFromName = (name: string) => {
        if (name.includes("Bedrock")) return "AWS Bedrock";
        if (name.includes("OpenAI")) return "OpenAI";
        if (name.includes("Anthropic") || name.includes("Claude")) return "Anthropic";
        if (name.includes("Google") || name.includes("Gemini")) return "Google";
        if (name.includes("AWS") || name.includes("Bedrock")) return "AWS Bedrock";
        if (name.includes("OLLama") || name.includes("Llama")) return "OLLama";
        return "Other";
    };

    const groupedModels = getGroupedModels();

    const setRecommendedModel = () => {
        setSelectedModel(recommendedModel.id);
    };

    useEffect(() => {
        if (!selectedModel) {
            setRecommendedModel();
        }
    }, [selectedModel]);

    return (
        <div>
            <Label htmlFor="model" className="block mb-2">
                AI Model
            </Label>
            <Select value={selectedModel} onValueChange={setSelectedModel} disabled={loading}>
                <SelectTrigger id="model">
                    <SelectValue placeholder="Select an AI model" />
                </SelectTrigger>
                <SelectContent>
                    {Object.entries(groupedModels).map(([company, models]) => (
                        <SelectGroup key={company}>
                            <SelectLabel>{company}</SelectLabel>
                            {models.map((model) => (
                                <SelectItem key={model.value} value={model.value}>
                                    {model.label}
                                </SelectItem>
                            ))}
                        </SelectGroup>
                    ))}
                </SelectContent>
            </Select>
            <p className="text-xs mt-2 text-gray-600 dark:text-gray-300">
                Recommended:{" "}
                <button className="text-blue-500 hover:underline" onClick={setRecommendedModel}>
                    {recommendedModel.name}
                </button>
                .
            </p>
        </div>
    );
};

export default AIModelSelection;
