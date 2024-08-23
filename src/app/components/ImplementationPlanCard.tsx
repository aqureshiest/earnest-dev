import React, { useState } from "react";
import { motion } from "framer-motion";

const ImplementationPlanCard = ({
    implementationPlan,
}: {
    implementationPlan: AIAssistantResponse<ImplementationPlan>;
}) => {
    const [isOpen, setIsOpen] = useState(
        Array(implementationPlan?.response?.implementationPlan.length).fill(false)
    );
    const [isEditing, setIsEditing] = useState(
        Array(implementationPlan?.response?.implementationPlan.length).fill(false)
    );

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
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-lg shadow p-6"
        >
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Implementation Plan</h2>
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
                {implementationPlan?.response?.implementationPlan.map((item, index) => (
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
                            <h3 className="font-normal text-gray-700">{item.step}</h3>
                            {/* <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleEditing(index);
                                }}
                                className="bg-gray-600 text-white px-2 py-1 rounded text-xs hover:bg-gray-500 transition disabled:bg-gray-400"
                                disabled={!isOpen[index]}
                            >
                                {isEditing[index] ? "Save" : "Edit"}
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
                                        value={item.thoughts}
                                        disabled={!isEditing[index]}
                                    />
                                </div>
                                <div className="space-y-2">
                                    {item.files.map((file, fileIndex) => (
                                        <motion.div
                                            key={fileIndex}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ duration: 0.3 }}
                                            className="space-y-2"
                                        >
                                            <div className="font-medium text-gray-700 flex items-center">
                                                <span className="mr-2">📄</span>
                                                {file.path}{" "}
                                                <span className="font-normal text-sm ml-2">
                                                    ({file.status})
                                                </span>
                                            </div>
                                            <textarea
                                                className="mt-1 block w-full p-2 border border-gray-300 rounded-md sm:text-sm"
                                                rows={file.todos.length}
                                                value={file.todos.join("\n")}
                                                disabled={!isEditing[index]}
                                            />
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
};

export default ImplementationPlanCard;
