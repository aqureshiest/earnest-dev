import mermaid from "mermaid";

// Flag to track initialization
let initialized = false;

export const initializeMermaid = () => {
    // Only initialize once, even if called multiple times
    if (typeof window !== "undefined" && !initialized) {
        mermaid.initialize({
            theme: "dark",
            securityLevel: "loose",
            fontFamily: "monospace",
            startOnLoad: false,
            darkMode: true,
            themeVariables: {
                primaryColor: "#6366f1",
                primaryTextColor: "#ffffff",
                primaryBorderColor: "#818cf8",
                lineColor: "#c7d2fe",
                secondaryColor: "#4f46e5",
                tertiaryColor: "#1e1b4b",
            },
        });

        initialized = true;
        console.log("Mermaid initialized");
    }

    return mermaid;
};

export default mermaid;
