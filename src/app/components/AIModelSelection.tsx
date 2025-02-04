import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { LLM_MODELS } from "@/modules/utils/llmInfo";
import { useEffect } from "react";

interface Props {
    selectedModel: string;
    setSelectedModel: (model: string) => void;
    loading: boolean;
}

const AIModelSelection = ({ selectedModel, setSelectedModel, loading }: Props) => {
    const DEFAULT_MODEL = LLM_MODELS.ANTHROPIC_CLAUDE_3_5_HAIKU_NEW;

    const getAvailabelModels = () => {
        const models = Object.entries(LLM_MODELS).map(([key, value]) => ({
            label: value.name,
            value: value.id,
        }));
        return models;
    };

    const availableModels = getAvailabelModels();

    const setDefaultModel = () => {
        setSelectedModel(DEFAULT_MODEL.id);
    };

    useEffect(() => {
        if (!selectedModel) {
            setDefaultModel();
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
                    {availableModels.map((model) => (
                        <SelectItem key={model.value} value={model.value}>
                            {model.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <p className="text-xs mt-2 text-gray-600 dark:text-gray-300">
                Recommended:{" "}
                <button className="text-blue-500 hover:underline" onClick={setDefaultModel}>
                    {DEFAULT_MODEL.name}
                </button>
                .
            </p>
        </div>
    );
};

export default AIModelSelection;
