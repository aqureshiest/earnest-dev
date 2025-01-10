import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { get } from "lodash";

// Common interface for UI configuration
interface ViewerConfig {
    visualization: string;
    outputViews: Array<{
        type: string;
        description: string;
    }>;
    layout?: string;
    sections?: Array<{
        type: string;
        data: string;
    }>;
}

// Props interface for the schema viewer
interface SchemaViewerProps {
    data: any;
    schema: {
        type: string;
        structure: Record<string, any>;
    };
    uiConfig: ViewerConfig;
}

const DynamicSchemaViewer: React.FC<SchemaViewerProps> = ({ data, schema, uiConfig }) => {
    console.log("Data:", data);
    console.log("Schema:", schema);
    console.log("UI Config:", uiConfig);
    const renderValue = (value: any, schemaType: string) => {
        if (Array.isArray(value)) {
            return (
                <div className="space-y-2">
                    {value.map((item, index) => (
                        <div key={index} className="pl-4 border-l-2 border-gray-200">
                            {renderSchemaBasedContent(item, schema.structure.items)}
                        </div>
                    ))}
                </div>
            );
        }

        switch (schemaType) {
            case "boolean":
                return value ? "✓" : "✗";
            case "object":
                return renderSchemaBasedContent(value, schema.structure);
            default:
                return String(value);
        }
    };

    const renderSchemaBasedContent = (data: any, structure: Record<string, any>) => {
        if (!data || !structure) return null;

        switch (uiConfig.visualization) {
            case "table":
                return (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {Object.keys(structure).map((key) => (
                                    <TableHead key={key}>{key}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                {Object.entries(structure).map(([key, schemaType]) => (
                                    <TableCell key={key}>
                                        {renderValue(data[key], schemaType as string)}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableBody>
                    </Table>
                );

            case "tree structure for endpoints":
                return (
                    <div className="space-y-2">
                        {Object.entries(data).map(([key, value]) => (
                            <div key={key} className="space-y-1">
                                <div className="font-medium">{key}</div>
                                <div className="pl-4">
                                    {renderValue(value, structure[key] as string)}
                                </div>
                            </div>
                        ))}
                    </div>
                );

            default:
                return (
                    <pre className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg overflow-auto">
                        <code>{JSON.stringify(data, null, 2)}</code>
                    </pre>
                );
        }
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>{schema.type} Viewer</CardTitle>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="formatted">
                    <TabsList>
                        <TabsTrigger value="formatted">Formatted View</TabsTrigger>
                        <TabsTrigger value="raw">Raw Data</TabsTrigger>
                    </TabsList>

                    <TabsContent value="formatted">
                        {renderSchemaBasedContent(data, schema.structure)}
                    </TabsContent>

                    <TabsContent value="raw">
                        <pre className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg overflow-auto">
                            <code>{JSON.stringify(data, null, 2)}</code>
                        </pre>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
};

// Dynamic layout component
interface DynamicLayoutProps {
    data: any;
    schema: {
        type: string;
        structure: Record<string, any>;
    };
    uiConfig: ViewerConfig;
}

const DynamicLayout: React.FC<DynamicLayoutProps> = ({ data, schema, uiConfig }) => {
    if (uiConfig.layout === "grid" && uiConfig.sections) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {uiConfig.sections.map((section, index) => (
                    <DynamicSchemaViewer
                        key={index}
                        data={get(data, section.data)}
                        schema={{
                            type: section.type,
                            structure: schema.structure[section.type],
                        }}
                        uiConfig={uiConfig}
                    />
                ))}
            </div>
        );
    }

    return <DynamicSchemaViewer data={data} schema={schema} uiConfig={uiConfig} />;
};

export default DynamicLayout;
