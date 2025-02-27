import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, RotateCcw, X, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import MarkdownViewer from "./MarkdownViewer";
import { v4 as uuidv4 } from "uuid";

export interface SectionFeedback {
    id: string;
    sectionId: string;
    audioBlob: Blob;
    timestamp: Date;
}

interface PRDSection {
    id: string;
    title: string;
    content: string;
    feedback: SectionFeedback[];
}

interface PRDFeedbackViewProps {
    content: string;
    onRegenerateSection: (sectionId: string, feedback: SectionFeedback[]) => void;
    isRegenerating?: boolean;
}

export const PRDFeedbackView: React.FC<PRDFeedbackViewProps> = ({
    content,
    onRegenerateSection,
    isRegenerating = false,
}) => {
    const [sections, setSections] = useState<PRDSection[]>(() => {
        const parts = content.split(/(?=^#{1,4} .*$)/m);
        return parts.map((part, index) => ({
            id: `section-${index}`,
            title: part.split("\n")[0].replace(/^#+\s/, ""),
            content: part,
            feedback: [],
        }));
    });

    const [isRecording, setIsRecording] = useState<string | null>(null); // stores sectionId when recording
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    useEffect(() => {
        const parts = content.split(/(?=^#{1,4} .*$)/m);
        setSections(
            parts.map((part, index) => ({
                id: `section-${index}`,
                title: part.split("\n")[0].replace(/^#+\s/, ""),
                content: part,
                feedback: sections[index]?.feedback || [],
            }))
        );
    }, [content]);

    const startRecording = async (sectionId: string) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
                addFeedback(sectionId, audioBlob);
                stream.getTracks().forEach((track) => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(sectionId);
        } catch (error) {
            console.error("Error starting recording:", error);
            toast({
                title: "Error",
                description: "Could not access microphone. Please check permissions.",
                variant: "destructive",
            });
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(null);
        }
    };

    const addFeedback = (sectionId: string, audioBlob: Blob) => {
        setSections((current) =>
            current.map((section) => {
                if (section.id === sectionId) {
                    return {
                        ...section,
                        feedback: [
                            ...section.feedback,
                            {
                                id: uuidv4(),
                                sectionId,
                                audioBlob,
                                timestamp: new Date(),
                            },
                        ],
                    };
                }
                return section;
            })
        );
    };

    const removeFeedback = (sectionId: string, feedbackId: string) => {
        setSections((current) =>
            current.map((section) => {
                if (section.id === sectionId) {
                    return {
                        ...section,
                        feedback: section.feedback.filter((f) => f.id !== feedbackId),
                    };
                }
                return section;
            })
        );
    };

    return (
        <div className="space-y-6">
            {sections.map((section) => (
                <div key={section.id} className="relative group">
                    <Card className="p-6">
                        {/* Section title with feedback count */}
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-medium">
                                {section.title}
                                {section.feedback.length > 0 && (
                                    <span className="ml-2 text-sm text-slate-500">
                                        ({section.feedback.length} voice notes)
                                    </span>
                                )}
                            </h3>
                            <div className="flex items-center gap-2">
                                {isRecording === section.id ? (
                                    <div className="flex items-center gap-2">
                                        <div className="animate-pulse">
                                            <Mic className="w-4 h-4 text-red-500" />
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={stopRecording}>
                                            <Square className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => startRecording(section.id)}
                                    >
                                        <Mic className="w-4 h-4" />
                                    </Button>
                                )}
                                {section.feedback.length > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                            onRegenerateSection(section.id, section.feedback)
                                        }
                                        disabled={isRegenerating}
                                    >
                                        <RotateCcw
                                            className={cn(
                                                "w-4 h-4",
                                                isRegenerating && "animate-spin"
                                            )}
                                        />
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Section content with markdown formatting */}
                        <div className="prose dark:prose-invert max-w-none">
                            <MarkdownViewer content={section.content} />
                        </div>

                        {/* Voice Notes */}
                        {section.feedback.length > 0 && (
                            <div className="mt-4 border-t pt-4 space-y-2">
                                {section.feedback.map((feedback) => (
                                    <div
                                        key={feedback.id}
                                        className="flex items-center justify-between gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded"
                                    >
                                        <audio
                                            controls
                                            src={URL.createObjectURL(feedback.audioBlob)}
                                            className="h-8"
                                        />
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeFeedback(section.id, feedback.id)}
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>
            ))}
        </div>
    );
};

export default PRDFeedbackView;
