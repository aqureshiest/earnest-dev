import React from "react";
import { motion } from "framer-motion";

const AssistantWorkspace = ({ assistantStates }: { assistantStates: any }) => {
    const assistants = [
        { name: "specifications", icon: "🔍" },
        { name: "planning", icon: "🔧" },
        { name: "code", icon: "📄" },
        { name: "PR", icon: "🚀" },
    ];

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Assistant Workspace</h2>
            <div className="flex justify-around mb-6">
                {assistants.map((assistant) => (
                    <div key={assistant.name} className="text-center">
                        <motion.div
                            className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl ${
                                assistantStates[assistant.name] === "working"
                                    ? `bg-green-300`
                                    : assistantStates[assistant.name] === "completed"
                                    ? `bg-green-100`
                                    : "bg-gray-200"
                            }`}
                            animate={
                                assistantStates[assistant.name] === "working"
                                    ? { scale: [1, 1.1, 1] }
                                    : { scale: 1 }
                            }
                            transition={
                                assistantStates[assistant.name] === "working"
                                    ? { repeat: Infinity, duration: 2 }
                                    : { duration: 0.3 }
                            }
                        >
                            {assistant.icon}
                        </motion.div>
                        <p className="mt-2 text-sm font-medium text-gray-600 capitalize">
                            {assistant.name}
                        </p>
                    </div>
                ))}
            </div>
            {/* <div className="space-y-4">
                {assistants.map((assistant) => (
                    <div key={assistant.name}>
                        <p className="text-sm font-medium text-gray-600 mb-1 capitalize">
                            {assistant.name}
                        </p>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <motion.div
                                className={`h-2.5 rounded-full bg-green-200`}
                                initial={{ width: "0%" }}
                                animate={{
                                    width:
                                        assistantStates[assistant.name] === "completed"
                                            ? "100%"
                                            : assistantStates[assistant.name] === "working"
                                            ? "50%"
                                            : "0%",
                                }}
                                transition={{ duration: 0.5 }}
                            />
                        </div>
                    </div>
                ))}
            </div> */}
        </div>
    );
};

export default AssistantWorkspace;
