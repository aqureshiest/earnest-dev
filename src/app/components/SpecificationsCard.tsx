import { useState } from "react";
import React from "react";

const SpecificationsCard = ({
    specifications,
}: {
    specifications: AIAssistantResponse<Specifications> | null;
}) => {
    const specs = (specifications?.response || []) as Specification[];

    const [isOpen, setIsOpen] = useState(Array(specs.length).fill(false));
    const [isEditable, setIsEditable] = useState(Array(specs.length).fill(false));

    const toggleAccordion = (index: number) => {
        setIsOpen((prevIsOpen) => {
            const newIsOpen = [...prevIsOpen];
            newIsOpen[index] = !newIsOpen[index];
            return newIsOpen;
        });
    };

    const toggleEditable = (index: number) => {
        setIsEditable((prevIsEditable) => {
            const newIsEditable = [...prevIsEditable];
            newIsEditable[index] = !newIsEditable[index];
            return newIsEditable;
        });
    };

    return (
        <>
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-gray-800">Specifications</h2>
                    {specifications && (
                        <div className="text-xs text-right">
                            <div className="text-gray-500">
                                Cost: ${specifications?.cost.toFixed(6)}
                            </div>
                            <div className="text-gray-500">
                                Input Tokens: {specifications?.inputTokens}
                            </div>
                            <div className="text-gray-500">
                                Output Tokens: {specifications?.outputTokens}
                            </div>
                        </div>
                    )}
                </div>
                <div className="space-y-4">
                    {specs.map((spec, index) => (
                        <div
                            key={index}
                            className="border border-gray-300 rounded-md shadow-sm transition-all duration-300 ease-in-out overflow-hidden"
                        >
                            <div
                                className="bg-gray-100 px-4 py-2 cursor-pointer flex justify-between items-center"
                                onClick={() => toggleAccordion(index)}
                            >
                                <h3 className="font-regular text-gray-700">{spec.title}</h3>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleEditable(index);
                                    }}
                                    disabled={!isOpen[index]}
                                    className="bg-gray-600 text-white px-2 py-1 rounded text-xs hover:bg-gray-500 transition disabled:bg-gray-400"
                                >
                                    {isEditable[index] ? "Save" : "Edit"}
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
                                            rows={3}
                                            value={spec.summary}
                                            disabled={!isEditable[index]}
                                        />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-600">
                                            Specification
                                        </h4>
                                        <textarea
                                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md sm:text-sm"
                                            rows={6}
                                            value={spec.key_steps?.join("\n")}
                                            disabled={!isEditable[index]}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                {specifications && false && (
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
        </>
    );
};

export default SpecificationsCard;
