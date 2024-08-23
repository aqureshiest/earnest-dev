import { useState } from "react";
import React from "react";

const ImplementationPlanCard = ({
    implementationPlan,
}: {
    implementationPlan: AIAssistantResponse<ImplementationPlan> | null;
}) => {
    const steps = (implementationPlan?.response?.steps || []) as Step[];

    const [isOpen, setIsOpen] = useState(Array(steps.length).fill(false));
    const [isEditing, setIsEditing] = useState(Array(steps.length).fill(false));

    const toggleAccordion = (index: number) => {
        setIsOpen((prevIsOpen) => {
            const newIsOpen = [...prevIsOpen];
            newIsOpen[index] = !newIsOpen[index];
            return newIsOpen;
        });
    };

    const toggleEditing = (index: number) => {
        setIsEditing((prevIsEditing) => {
            const newIsEditing = [...prevIsEditing];
            newIsEditing[index] = !newIsEditing[index];
            return newIsEditing;
        });
    };

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-gray-800">Implementation Plan</h2>
                </div>
                {implementationPlan && (
                    <div className="text-xs text-right">
                        <div className="text-gray-500">
                            Cost: ${implementationPlan?.cost.toFixed(6)}
                        </div>
                        <div className="text-gray-500">
                            Input Tokens: {implementationPlan?.inputTokens}
                        </div>
                        <div className="text-gray-500">
                            Output Tokens: {implementationPlan?.outputTokens}
                        </div>
                    </div>
                )}
            </div>
            <div className="space-y-4">
                {steps.map((step, index) => (
                    <div
                        key={index}
                        className="border border-gray-300 rounded-md shadow-sm overflow-hidden"
                    >
                        <div
                            className="bg-gray-100 px-4 py-2 cursor-pointer flex justify-between items-center"
                            onClick={() => toggleAccordion(index)}
                        >
                            <h3 className="font-normal text-gray-700">{step.title}</h3>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleEditing(index);
                                }}
                                className="bg-gray-600 text-white px-2 py-1 rounded text-xs hover:bg-gray-500 transition disabled:bg-gray-400"
                                disabled={!isOpen[index]}
                            >
                                {isEditing[index] ? "Save" : "Edit"}
                            </button>
                        </div>
                        {isOpen[index] && (
                            <div className="p-4 space-y-4">
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-600">
                                        Thoughts
                                    </h4>
                                    <textarea
                                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md sm:text-sm"
                                        rows={2}
                                        value={step.thoughts}
                                        disabled={!isEditing[index]}
                                    />
                                </div>
                                <div className="space-y-2">
                                    {step.files.map((file, fileIndex) => (
                                        <div key={fileIndex} className="space-y-2">
                                            <div className="font-medium text-gray-700">
                                                {file.path}{" "}
                                                <span className="font-normal text-sm">
                                                    ({file.operation})
                                                </span>
                                            </div>
                                            <textarea
                                                className="mt-1 block w-full p-2 border border-gray-300 rounded-md sm:text-sm"
                                                rows={3}
                                                value={file.todos.join("\n")}
                                                disabled={!isEditing[index]}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            {implementationPlan && false && (
                <div className="flex justify-end mt-6">
                    <button
                        className="bg-teal-700 text-white px-4 py-2 rounded hover:bg-teal-600 transition text-sm disabled:bg-teal-500"
                        disabled
                    >
                        Confirm & Proceed
                    </button>
                </div>
            )}
        </div>
    );
};
export default ImplementationPlanCard;
