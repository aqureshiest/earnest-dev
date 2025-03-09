import Bugsnag from "@bugsnag/js";

export function initBugsnag() {
    // Detect current environment
    const currentEnv = process.env.NODE_ENV || "development";

    // Check if local testing is enabled via env var
    const localTesting = process.env.BUGSNAG_LOCAL_TESTING === "true";

    // Define which environments should report errors
    const enabledStages = localTesting
        ? ["production", "development"] // Include development when testing
        : ["production"]; // Normal production setting

    console.log(`Initializing Bugsnag with release stage: ${currentEnv}`);
    console.log(`Bugsnag enabled for stages: ${enabledStages.join(", ")}`);

    Bugsnag.start({
        apiKey: process.env.BUGSNAG_API_KEY || "",
        appVersion: process.env.npm_package_version,
        enabledReleaseStages: enabledStages,
        releaseStage: currentEnv,
        metadata: {
            application: {
                name: "Earnest AI Code Generator",
            },
        },
    });

    return Bugsnag;
}

let bugsnagInstance: typeof Bugsnag | null = null;

export function getBugsnag() {
    if (!bugsnagInstance) {
        bugsnagInstance = initBugsnag();
    }
    return bugsnagInstance;
}
