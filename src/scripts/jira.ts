import { loadEnvConfig } from "@next/env";

loadEnvConfig("");

interface JiraConfig {
    baseUrl: string;
    username: string;
    apiToken: string;
}

interface JiraTicket {
    id: string;
    key: string;
    summary: string;
    status: string;
    // Add more fields as needed
}

interface JiraEpic {
    id: string;
    key: string;
    name: string;
    summary: string;
    // Add more fields as needed
}

class JiraService {
    private config: JiraConfig;

    constructor(config: JiraConfig) {
        this.config = config;
    }

    private async makeRequest(endpoint: string, method: string = "GET", data?: any) {
        const url = `${this.config.baseUrl}/rest/api/3${endpoint}`;
        const headers = {
            Authorization: `Basic ${Buffer.from(
                `${this.config.username}:${this.config.apiToken}`
            ).toString("base64")}`,
            Accept: "application/json",
            "Content-Type": "application/json",
        };

        try {
            // make a fetch call
            const response = await fetch(url, {
                method,
                headers,
                body: data ? JSON.stringify(data) : undefined,
            });
            return await response.json();
        } catch (error) {
            console.error("Error making JIRA request:", error);
            throw error;
        }
    }

    async getTicket(ticketKey: string): Promise<JiraTicket> {
        const data = await this.makeRequest(`/issue/${ticketKey}`);

        return {
            id: data.id,
            key: data.key,
            summary: data.fields.summary,
            status: data.fields.status.name,
            // Map other fields as needed
        };
    }

    async getEpic(epicKey: string): Promise<JiraEpic> {
        const data = await this.makeRequest(`/issue/${epicKey}`);

        return {
            id: data.id,
            key: data.key,
            name: data.fields.customfield_10011, // Epic Name field (may vary)
            summary: data.fields.summary,
            // Map other fields as needed
        };
    }

    async getTicketsInEpic(epicKey: string): Promise<JiraTicket[]> {
        const jql = `"Epic Link" = ${epicKey}`;
        const data = await this.makeRequest("/search", "POST", { jql });
        return data.issues.map((issue: any) => ({
            id: issue.id,
            key: issue.key,
            summary: issue.fields.summary,
            status: issue.fields.status.name,
            // Map other fields as needed
        }));
    }
}

// Example usage
const jiraConfig: JiraConfig = {
    baseUrl: "https://meetearnest.atlassian.net",
    username: "adeel.qureshi@earnest.com",
    apiToken: process.env.JIRA_API_TOKEN!,
};

const jiraService = new JiraService(jiraConfig);

async function main() {
    try {
        const ticket = await jiraService.getTicket("LC-646");
        console.log("Ticket:", ticket);

        const epic = await jiraService.getEpic("LC-1573");
        console.log("Epic:", epic);

        const ticketsInEpic = await jiraService.getTicketsInEpic("LC-1573");
        console.log("Tickets in Epic:", ticketsInEpic);
    } catch (error) {
        console.error("Error:", error);
    }
}

main();
