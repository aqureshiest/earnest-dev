import mermaid from "mermaid";

// Flag to track initialization
let initialized = false;

export const initializeMermaid = () => {
    // Only initialize once, even if called multiple times
    if (typeof window !== "undefined" && !initialized) {
        // Check if system prefers dark mode
        const prefersDarkMode =
            window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;

        mermaid.initialize({
            securityLevel: "loose",
            startOnLoad: false,
            darkMode: prefersDarkMode, // Use system preference for dark mode
        });

        // Add listener to update theme if system preference changes
        if (window.matchMedia) {
            window
                .matchMedia("(prefers-color-scheme: dark)")
                .addEventListener("change", (event) => {
                    mermaid.initialize({
                        securityLevel: "loose",
                        startOnLoad: false,
                        darkMode: event.matches,
                    });
                });
        }

        initialized = true;
        console.log("Mermaid initialized with darkMode:", prefersDarkMode);
    }

    return mermaid;
};

export default mermaid;
