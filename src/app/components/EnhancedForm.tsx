import React from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface EnhancedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    className?: string;
}

interface EnhancedTextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
    className?: string;
}

export const EnhancedInput: React.FC<EnhancedInputProps> = ({
    label,
    error,
    className,
    ...props
}) => {
    return (
        <div className="space-y-2">
            {label && (
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {label}
                </Label>
            )}
            <Input
                className={cn(
                    "transition-all duration-200",
                    "border-2 rounded-lg",
                    "focus:ring-2 focus:ring-primary/20 focus:border-primary",
                    "hover:border-primary/50",
                    "placeholder:text-slate-400",
                    error && "border-red-500 focus:border-red-500 focus:ring-red-200",
                    className
                )}
                {...props}
            />
            {error && (
                <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-500 mt-1"
                >
                    {error}
                </motion.p>
            )}
        </div>
    );
};

export const EnhancedTextarea: React.FC<EnhancedTextAreaProps> = ({
    label,
    error,
    className,
    ...props
}) => {
    return (
        <div className="space-y-2">
            {label && (
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {label}
                </Label>
            )}
            <Textarea
                className={cn(
                    "transition-all duration-200",
                    "border-2 rounded-lg",
                    "focus:ring-2 focus:ring-primary/20 focus:border-primary",
                    "hover:border-primary/50",
                    "placeholder:text-slate-400",
                    "min-h-[120px] resize-y",
                    error && "border-red-500 focus:border-red-500 focus:ring-red-200",
                    className
                )}
                {...props}
            />
            {error && (
                <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-500 mt-1"
                >
                    {error}
                </motion.p>
            )}
        </div>
    );
};

// Example usage in a form group
export const EnhancedFormGroup: React.FC = () => {
    return (
        <Card className="transition-all duration-200 hover:shadow-md border-2 hover:border-primary/50">
            <CardContent className="p-6 space-y-6">
                <div className="space-y-4">
                    <EnhancedInput
                        label="Feature Name"
                        placeholder="Enter the feature name"
                        className="w-full"
                    />

                    <EnhancedTextarea
                        label="Feature Description"
                        placeholder="Describe the feature in detail..."
                        className="w-full"
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <EnhancedInput label="Priority" placeholder="High" className="w-full" />
                        <EnhancedInput label="Target Date" type="date" className="w-full" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default EnhancedFormGroup;
