import React from "react";
import ClarifyingQuestionsModal from "./ClarifyingQuestionsModal";

interface IntegrationQuestion {
    id: string;
    question: string;
    type: "single" | "multiple";
    choices: {
        id: string;
        text: string;
    }[];
    answer: string[];
}

interface IntegrationQuestions {
    title: string;
    questions: IntegrationQuestion[];
}

interface IntegrationQuestionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    questions: IntegrationQuestions;
    onComplete: (responses: IntegrationQuestion[]) => void;
    isLoading: boolean;
}

// This is an adapter component that maps the IntegrationQuestions format to our unified component
const IntegrationQuestionsModal: React.FC<IntegrationQuestionsModalProps> = ({
    isOpen,
    onClose,
    questions,
    onComplete,
    isLoading,
}) => {
    // Transform IntegrationQuestions into the format expected by ClarifyingQuestionsModal
    const transformToSection = (questions: IntegrationQuestions) => {
        return [
            {
                id: "integration-questions",
                title: questions.title || "Integration Test Questions",
                description:
                    "Please answer these questions to help generate more accurate integration test specifications.",
                questions: questions.questions,
            },
        ];
    };

    const sections = transformToSection(questions);

    const handleComplete = (responses: any[]) => {
        // Since we're only using a single section for integration questions,
        // we just need to extract the questions from the first section
        onComplete(responses[0].questions);
    };

    return (
        <ClarifyingQuestionsModal
            isOpen={isOpen}
            onClose={onClose}
            sections={sections}
            onComplete={handleComplete}
            isLoading={isLoading}
            showSectionNavigation={false}
            completeButtonText="Generate Test Specification"
            modalTitle={questions.title}
            modalDescription="Please answer these questions to help generate more accurate integration test specifications."
        />
    );
};

export default IntegrationQuestionsModal;
