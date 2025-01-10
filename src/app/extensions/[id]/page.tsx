import { ExtensionDataStore } from "@/modules/ai/extensions/ExtensionDataStore";
import { notFound } from "next/navigation";
import { ExtensionConfig } from "@/modules/ai/extensions/types";
import ExtensionDetail from "@/app/components/ExtensionDetail";

interface PageProps {
    params: {
        id: string;
    };
}

async function getExtensionConfig(id: string): Promise<ExtensionConfig> {
    const dataStore = new ExtensionDataStore();

    try {
        return await dataStore.loadExtensionConfig(id);
    } catch (error) {
        console.error("Error loading extension:", error);
        notFound();
    }
}

export default async function ExtensionPage({ params }: PageProps) {
    const extensionConfig = await getExtensionConfig(params.id);

    return <ExtensionDetail extensionId={params.id} extensionConfig={extensionConfig} />;
}

export async function generateMetadata({ params }: PageProps) {
    try {
        const extensionConfig = await getExtensionConfig(params.id);

        return {
            title: `${extensionConfig.name} - Code Analysis Extension`,
            description: extensionConfig.description,
        };
    } catch {
        return {
            title: "Extension Not Found",
        };
    }
}
