import React from "react";
import { Progress } from "@/components/ui/progress";

interface ProgressBarProps {
    current: number;
    total: number;
}

const TasksProgressBar: React.FC<ProgressBarProps> = ({ current, total }) => {
    console.log("current", current);
    console.log("total", total);
    const percentage = Math.round((current / total) * 100);
    console.log("percentage", percentage);

    return (
        <div className="w-full p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md mt-4">
            <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Task Progress
                </span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    {percentage}%
                </span>
            </div>
            <Progress value={percentage} className="w-full" />
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {current} of {total} tasks completed
            </div>
        </div>
    );
};

export default TasksProgressBar;
