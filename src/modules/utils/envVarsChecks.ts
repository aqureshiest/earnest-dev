export const areAppTokensPresents = (): boolean => {
    const requiredEnvVars = [
        "GITHUB_APP_ID",
        "GITHUB_CLIENT_ID",
        "GITHUB_CLIENT_SECRET",
        "GITHUB_INSTALLATION_ID",
        "GITHUB_PRIVATE_KEY",
    ];
    for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
            console.error(`Missing environment variable: ${envVar}`);
            return false;
        }
    }
    return true;
};

export const areAccessTokensPresent = (): boolean => {
    const requiredEnvVars = ["GITHUB_TOKEN"];
    for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
            console.error(`Missing environment variable: ${envVar}`);
            return false;
        }
    }
    return true;
};
