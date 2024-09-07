import { useState } from "react";

export enum AssistantState {
    Idle = "idle",
    Working = "working",
    Completed = "completed",
    Failed = "failed",
}

export type AssistantStates = {
    specifications: AssistantState;
    planning: AssistantState;
    code: AssistantState;
    PR: AssistantState;
};

export const useAssistantStates = () => {
    const [assistantStates, setAssistantStates] = useState<AssistantStates>({
        specifications: AssistantState.Idle,
        planning: AssistantState.Idle,
        code: AssistantState.Idle,
        PR: AssistantState.Idle,
    });

    const updateAssistantState = (assistant: keyof AssistantStates, state: AssistantState) => {
        setAssistantStates((prev) => ({ ...prev, [assistant]: state }));
    };

    const resetAssistantStates = () => {
        setAssistantStates({
            specifications: AssistantState.Idle,
            planning: AssistantState.Idle,
            code: AssistantState.Idle,
            PR: AssistantState.Idle,
        });
    };

    return { assistantStates, updateAssistantState, resetAssistantStates };
};
