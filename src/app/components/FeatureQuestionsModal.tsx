import React, { useEffect, useState } from "react";
import ClarifyingQuestionsModal from "./ClarifyingQuestionsModal";
import { FeatureQuestions } from "@/types/prd";

interface FeatureQuestionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    features: FeatureQuestions[];
    onComplete: (responses: FeatureQuestions[]) => void;
    isLoading?: boolean;
}

// This is an adapter component that maps the FeatureQuestions format to our unified component
const FeatureQuestionsModal: React.FC<FeatureQuestionsModalProps> = ({
    isOpen,
    onClose,
    features,
    onComplete,
    isLoading = false,
}) => {
    // Transform FeatureQuestions into the format expected by ClarifyingQuestionsModal
    const transformFeaturesToSections = (features: FeatureQuestions[]) => {
        return features.map((feature) => ({
            id: feature.featureId,
            title: feature.featureName,
            description: "Help us understand your requirements better",
            questions: feature.questions,
        }));
    };

    // Transform back from ClarifyingQuestionsModal format to FeatureQuestions
    const transformSectionsToFeatures = (sections: any[]) => {
        return sections.map((section) => ({
            featureId: section.id,
            featureName: section.title,
            questions: section.questions,
        }));
    };

    const sections = transformFeaturesToSections(features);

    const handleComplete = (responses: any[]) => {
        onComplete(transformSectionsToFeatures(responses));
    };

    return (
        <ClarifyingQuestionsModal
            isOpen={isOpen}
            onClose={onClose}
            sections={sections}
            onComplete={handleComplete}
            isLoading={isLoading}
            showSectionNavigation={true}
            completeButtonText="Complete"
            allowSkip={false}
        />
    );
};

export default FeatureQuestionsModal;
