import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    ResponsiveContainer,
    LineChart,
    Line,
    BarChart,
    Bar,
    AreaChart,
    Area,
    PieChart,
    Pie,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from "recharts";
import ReactMarkdown from "react-markdown";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";
import _ from "lodash";
import { jsonToMarkdown } from "./GenericMarkdownViewer";
import remarkGfm from "remark-gfm";

interface VisualizationProps {
    data: any;
    config: any;
}

export const DataTable: React.FC<VisualizationProps> = ({ data, config }) => {
    // Convert data to array format if it's an object
    const getRowsFromData = (inputData: any): any[] => {
        if (Array.isArray(inputData)) {
            return inputData;
        }

        // If it's an object with a single key containing an array, use that array
        if (typeof inputData === "object" && inputData !== null) {
            const keys = Object.keys(inputData);
            if (keys.length === 1 && Array.isArray(inputData[keys[0]])) {
                return inputData[keys[0]];
            }

            // Convert object to array of values
            return Object.entries(inputData).map(([key, value]) => {
                if (typeof value === "object" && value !== null) {
                    // Type check for metrics property
                    const valueWithMetrics = value as { metrics?: Record<string, any> };
                    const flattenedMetrics = valueWithMetrics.metrics
                        ? Object.entries(valueWithMetrics.metrics).reduce(
                              (acc, [metricKey, metricValue]) => ({
                                  ...acc,
                                  [`metrics.${metricKey}`]: metricValue,
                              }),
                              {}
                          )
                        : {};

                    return {
                        key,
                        ...value,
                        ...flattenedMetrics,
                    };
                }
                return { key, value };
            });
        }

        return [inputData];
    };

    const rows = getRowsFromData(data);

    // Get value from an object using dot notation path
    const getNestedValue = (obj: any, path: string) => {
        return _.get(obj, path);
    };

    // If columns are not specified, generate them from the first row
    const columns =
        config.columns ||
        (rows[0]
            ? Object.keys(rows[0])
                  .filter((key) => typeof rows[0][key] !== "object") // Filter out nested objects
                  .map((key) => ({
                      key,
                      label: key
                          .split(".")
                          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                          .join(" "),
                  }))
            : []);

    return (
        <Card>
            {config.title && (
                <CardHeader>
                    <CardTitle>{config.title}</CardTitle>
                    {config.description && (
                        <p className="text-sm text-muted-foreground">{config.description}</p>
                    )}
                </CardHeader>
            )}
            <CardContent>
                <ScrollArea className="h-[400px]">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {columns.map((col: any) => (
                                    <TableHead key={col.key}>{col.label}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map((row: any, i: number) => (
                                <TableRow key={i}>
                                    {columns.map((col: any) => (
                                        <TableCell key={col.key}>
                                            {getNestedValue(row, col.key)?.toString() || ""}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};

export const DataTree: React.FC<VisualizationProps> = ({ data, config }) => {
    const { nodeKey, childrenKey, labelKey } = config || {};
    console.log("Tree config:", config);

    const TreeNode: React.FC<{ node: any; depth?: number }> = ({ node, depth = 0 }) => {
        const [isOpen, setIsOpen] = useState(true);
        const hasChildren = node[childrenKey]?.length > 0;

        return (
            <div className="ml-4">
                <div className="flex items-center gap-2 py-1">
                    {hasChildren && (
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="w-4 h-4 flex items-center justify-center text-sm text-muted-foreground hover:text-foreground"
                        >
                            {isOpen ? "▼" : "▶"}
                        </button>
                    )}
                    {!hasChildren && <div className="w-4" />}
                    <span className="text-sm">{node[labelKey]}</span>
                    {/* optionally show type */}
                    {node.type && (
                        <span className="text-xs text-muted-foreground ml-2">{node.type}</span>
                    )}
                </div>
                {isOpen && hasChildren && (
                    <div className="border-l border-border pl-2">
                        {node[childrenKey].map((child: any) => (
                            <TreeNode key={child[nodeKey]} node={child} depth={depth + 1} />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <Card>
            {config.title && (
                <CardHeader>
                    <CardTitle>{config.title}</CardTitle>
                    {config.description && (
                        <p className="text-sm text-muted-foreground">{config.description}</p>
                    )}
                </CardHeader>
            )}
            <CardContent>
                <ScrollArea className="h-[400px]">
                    <div className="pr-4">
                        <TreeNode node={data} />
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};

export const DataChart: React.FC<VisualizationProps> = ({ data, config }) => {
    // Helper function to get chart keys (exclude x-axis key)
    const getChartKeys = (data: any[]) => {
        if (!data.length) return [];
        const sample = data[0];
        return Object.keys(sample).filter(
            (key) => key !== config.xAxisKey && typeof sample[key] === "number"
        );
    };

    // Function to render the appropriate chart type
    const renderChart = () => {
        const chartKeys = getChartKeys(data);
        const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#008080", "#d53e4f"];

        switch (config.chartType?.toLowerCase()) {
            case "bar":
                return (
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey={config.xAxisKey || "name"} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        {chartKeys.map((key, index) => (
                            <Bar
                                key={key}
                                dataKey={key}
                                fill={COLORS[index % COLORS.length]}
                                name={key}
                            />
                        ))}
                    </BarChart>
                );

            case "area":
                return (
                    <AreaChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey={config.xAxisKey || "name"} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        {chartKeys.map((key, index) => (
                            <Area
                                key={key}
                                type="monotone"
                                dataKey={key}
                                fill={COLORS[index % COLORS.length]}
                                stroke={COLORS[index % COLORS.length]}
                                name={key}
                            />
                        ))}
                    </AreaChart>
                );

            case "pie":
                return (
                    <PieChart>
                        <Pie
                            data={data}
                            nameKey={config.xAxisKey || "name"}
                            dataKey={chartKeys[0]}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            fill="#8884d8"
                            label
                        />
                        <Tooltip />
                        <Legend />
                    </PieChart>
                );

            case "line":
            default:
                return (
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey={config.xAxisKey || "name"} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        {chartKeys.map((key, index) => (
                            <Line
                                key={key}
                                type="monotone"
                                dataKey={key}
                                stroke={COLORS[index % COLORS.length]}
                                name={key}
                            />
                        ))}
                    </LineChart>
                );
        }
    };

    return (
        <Card>
            {config.title && (
                <CardHeader>
                    <CardTitle>{config.title}</CardTitle>
                    {config.description && (
                        <p className="text-sm text-muted-foreground">{config.description}</p>
                    )}
                </CardHeader>
            )}
            <CardContent>
                <div className="h-[400px] w-full">
                    <ResponsiveContainer>{renderChart()}</ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
};

export const CodeView: React.FC<VisualizationProps> = ({ data, config }) => {
    return (
        <Card>
            {config.title && (
                <CardHeader>
                    <CardTitle>{config.title}</CardTitle>
                </CardHeader>
            )}
            <CardContent>
                <ScrollArea className="h-[400px]">
                    <pre className="p-4 bg-muted rounded-lg overflow-auto">
                        <code>
                            {typeof data === "string" ? data : JSON.stringify(data, null, 2)}
                        </code>
                    </pre>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};

export const MarkdownView: React.FC<VisualizationProps> = ({ data, config }) => {
    console.log("Markdown data:", data);

    // Convert data to markdown string
    const content =
        typeof data === "string"
            ? data // If it's already a string, use it directly
            : jsonToMarkdown(data); // Otherwise convert JSON to markdown

    return (
        <Card>
            {config.title && (
                <CardHeader>
                    <CardTitle>{config.title}</CardTitle>
                </CardHeader>
            )}
            <CardContent>
                <ScrollArea className="h-[600px]">
                    <div className="prose dark:prose-invert max-w-none p-4">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};

export const SwaggerView: React.FC<VisualizationProps> = ({ data, config }) => {
    // Convert XML to JSON if needed
    const getSwaggerJson = (data: any) => {
        if (typeof data === "string" && data.includes("<?xml")) {
            // If it's XML, you might need to convert it to JSON
            // For now, we'll just handle JSON data
            return {};
        }
        return typeof data === "object" ? data : JSON.parse(data);
    };

    return (
        <Card>
            {config.title && (
                <CardHeader>
                    <CardTitle>{config.title}</CardTitle>
                </CardHeader>
            )}
            <CardContent>
                <div className="h-[600px] overflow-auto border rounded-lg">
                    <SwaggerUI spec={getSwaggerJson(data)} />
                </div>
            </CardContent>
        </Card>
    );
};

export const VisualizationRenderer: React.FC<{
    data: any;
    config: any;
}> = ({ data, config }) => {
    console.log("Visualization config:", config);

    // Get data - if dataPath is not specified, use entire data object
    const getData = (path?: string) => {
        if (!path) return data;
        // Use lodash get to extract the nested data
        const result = _.get(data, path);
        // If result not found with the path, return fallback
        return result ?? data;
    };

    return (
        <div className="space-y-4">
            {config.components.map((component: any) => {
                const componentData = getData(component.dataPath);
                console.log(`Component ${component.id} data:`, componentData);

                switch (component.type) {
                    case "table":
                        return (
                            <DataTable
                                key={component.id}
                                data={componentData}
                                config={component.config}
                            />
                        );
                    case "tree":
                        return (
                            <DataTree
                                key={component.id}
                                data={componentData}
                                config={component.config}
                            />
                        );
                    case "chart":
                        return (
                            <DataChart
                                key={component.id}
                                data={componentData}
                                config={component.config}
                            />
                        );
                    case "code":
                        return (
                            <CodeView
                                key={component.id}
                                data={componentData}
                                config={component.config}
                            />
                        );
                    case "swagger":
                        // For swagger, always use the entire result
                        return (
                            <SwaggerView key={component.id} data={data} config={component.config} />
                        );
                    case "markdown":
                        return (
                            <MarkdownView
                                key={component.id}
                                data={componentData}
                                config={component.config}
                            />
                        );
                    default:
                        return null;
                }
            })}
        </div>
    );
};

export default VisualizationRenderer;
