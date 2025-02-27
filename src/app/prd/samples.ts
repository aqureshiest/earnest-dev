import type { PRDInput } from "@/types/prd";
import { v4 as uuidv4 } from "uuid";

export const LocalLensPRD: PRDInput = {
    goalStatement:
        "To help travelers and locals discover authentic, personalized local experiences by connecting them with resident experts and hidden gems, while helping small businesses and local guides reach their ideal customers.",

    targetAudience: [
        "Adventure-seeking travelers (25-45) who want to experience cities like a local",
        "Local residents passionate about sharing their city's hidden gems",
        "Small business owners and local tour guides seeking to reach tourism traffic",
        "Digital nomads looking to quickly immerse themselves in new cities",
    ],

    keyFeatures: [
        {
            id: "local-stories",
            name: "Local Stories Feed",
            description:
                "A curated feed of photo-rich stories from local experts highlighting hidden gems, complete with historical context, best times to visit, and insider tips. Stories are algorithmically ranked based on authenticity signals and user engagement.",
            priority: "high",
            clarifyingQuestions:
                "How do we verify local expert status? What metrics define 'authenticity'?",
        },
        {
            id: "experience-mapping",
            name: "Interactive Experience Map",
            description:
                "Real-time map showing nearby hidden gems, color-coded by category (food, culture, nature, etc.). Users can create and share custom walking routes linking multiple experiences. Includes offline mode for travelers.",
            priority: "high",
            clarifyingQuestions:
                "How do we handle areas with limited GPS accuracy? Should we integrate with existing mapping services?",
        },
        {
            id: "local-matching",
            name: "Local Expert Matching",
            description:
                "AI-powered system that matches visitors with local experts based on shared interests, language, and availability for personalized tours or recommendations. Includes in-app messaging and scheduling.",
            priority: "medium",
            clarifyingQuestions:
                "What verification process should we implement for local experts? How do we handle payment splitting?",
        },
        {
            id: "ar-discovery",
            name: "AR Experience Layer",
            description:
                "Point your camera at a street or building to see historical information, hidden entrance locations, local stories, and real-time crowd levels overlaid in AR.",
            priority: "low",
            clarifyingQuestions:
                "What are the minimum device requirements? How do we handle AR calibration in dense urban areas?",
        },
    ],

    constraints: [
        "Must work offline for travelers with limited data connectivity",
        "Need to protect privacy of local guides while maintaining trust and safety",
        "Platform needs to scale across different languages and cultures",
        "Must comply with local tourism and guide licensing regulations",
        "Need to maintain content authenticity while scaling user-generated content",
        "Battery usage must be optimized when using GPS and AR features",
    ],
};

export const loanConsolidationPRD: PRDInput = {
    goalStatement:
        "Create a new servicing dashboard for users to perform various tasks including offering the ability to consolidate previous loans using the Earnest new product called Personal Loans.",

    targetAudience: ["Existing Earnest Refi customers"],
    constraints: ["Using prefill requires us to access the existing data."],
    keyFeatures: [
        {
            id: uuidv4(),
            name: "Consolidate Previous Loans",
            description:
                "Ability to consolidate previous loans and creating consolidated personal loan from prefilled application data",
            priority: "high",
        },
    ],
};
