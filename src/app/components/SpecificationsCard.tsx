import React, { useState } from "react";
import { motion } from "framer-motion";

const SpecificationsCard = ({
    specifications,
}: {
    specifications: AIAssistantResponse<Specifications>;
}) => {
    const [isOpen, setIsOpen] = useState(
        Array(specifications?.response?.specifications.length).fill(false)
    );
    const [isEditable, setIsEditable] = useState(
        Array(specifications?.response?.specifications.length).fill(false)
    );

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
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-lg shadow p-6"
        >
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Specifications</h2>
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
                {specifications?.response?.specifications.map((spec, index) => (
                    <motion.div
                        key={index}
                        initial={false}
                        animate={{ height: isOpen[index] ? "auto" : 40 }}
                        transition={{ duration: 0.3 }}
                        className="border border-gray-300 rounded-md shadow-sm overflow-hidden"
                    >
                        <div
                            className="bg-gray-100 px-4 py-2 cursor-pointer flex justify-between items-center"
                            onClick={() => toggleAccordion(index)}
                        >
                            <h3 className="font-regular text-gray-700">{spec.title}</h3>
                            {/* <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleEditable(index);
                                }}
                                disabled={!isOpen[index]}
                                className="bg-gray-600 text-white px-2 py-1 rounded text-xs hover:bg-gray-500 transition disabled:bg-gray-400"
                            >
                                {isEditable[index] ? "Save" : "Edit"}
                            </button> */}
                        </div>
                        {isOpen[index] && (
                            <div className="p-4 space-y-4">
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-600 flex items-center">
                                        <span className="mr-2">💡</span> Thoughts
                                    </h4>
                                    <textarea
                                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md sm:text-sm"
                                        rows={2}
                                        value={spec.thoughts}
                                        disabled={!isEditable[index]}
                                    />
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-600 flex items-center">
                                        <span className="mr-2">📋</span> Specification
                                    </h4>
                                    <textarea
                                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md sm:text-sm"
                                        rows={spec.keySteps.length}
                                        value={spec.keySteps.join("\n")}
                                        disabled={!isEditable[index]}
                                    />
                                </div>
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
};

export default SpecificationsCard;
