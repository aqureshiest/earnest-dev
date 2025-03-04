import React from "react";
import { motion } from "framer-motion";

interface ProgressBarProps {
    currentStep: number;
    totalSteps: number;
    isActive: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ currentStep, totalSteps, isActive }) => {
    const progress = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;

    return (
        <div className="w-full bg-accent rounded-full h-2.5 mb-4 relative overflow-hidden">
            <motion.div
                className="bg-primary h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
            />
            {isActive && (
                <motion.div
                    className="absolute top-0 left-0 h-full w-full bg-white opacity-20"
                    animate={{ x: ["0%", "100%"] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                />
            )}
        </div>
    );
};

export default ProgressBar;
