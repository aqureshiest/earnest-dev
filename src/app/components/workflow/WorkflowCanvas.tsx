import React, { useState, useCallback, useMemo } from "react";
import NodeConfigPanel from "./NodeConfigPanel";
import ReactFlow, {
    MiniMap,
    Controls,
    Background,
    BackgroundVariant,
    Node,
    Edge,
    Connection,
    NodeChange,
    EdgeChange,
    useNodesState,
    useEdgesState,
    addEdge,
    Panel,
} from "reactflow";
import { PlusCircle, Save, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AIAgentNode from "./nodes/AIAgentNode";

// Define node types
const nodeTypes = {
    aiAgent: AIAgentNode,
};

// Initial demo nodes - adjusted for horizontal layout
const initialNodes: Node[] = [
    {
        id: "1",
        type: "input",
        data: {
            label: "Input Node",
            type: "input",
            configuration: {},
        },
        position: { x: 100, y: 250 },
    },
    {
        id: "2",
        type: "ai-agent",
        data: {
            label: "AI Agent",
            type: "ai-agent",
            configuration: {},
        },
        position: { x: 300, y: 250 },
    },
    {
        id: "3",
        type: "output",
        data: {
            label: "Output Node",
            type: "output",
            configuration: {},
        },
        position: { x: 500, y: 250 },
    },
];

// Initial demo edges
const initialEdges: Edge[] = [
    { id: "e1-2", source: "1", target: "2" },
    { id: "e2-3", source: "2", target: "3" },
];

const WorkflowCanvas = () => {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);

    // Handle new connections
    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    );

    // Handle node selection
    const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
        setSelectedNode(node);
    }, []);

    return (
        <div className="h-screen flex flex-col bg-background">
            {/* Top Bar */}
            <div className="h-16 border-b px-4 flex items-center justify-between">
                <h1 className="text-xl font-semibold">Workflow Editor</h1>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                        <Save className="mr-2 h-4 w-4" />
                        Save
                    </Button>
                    <Button size="sm">
                        <PlayCircle className="mr-2 h-4 w-4" />
                        Run Workflow
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar - Node Library */}
                <div className="w-64 border-r bg-background p-4">
                    <h2 className="font-semibold mb-4">Node Library</h2>
                    <div className="space-y-2">
                        <Button variant="outline" className="w-full justify-start">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            AI Agent
                        </Button>
                        <Button variant="outline" className="w-full justify-start">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Input Node
                        </Button>
                        <Button variant="outline" className="w-full justify-start">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Output Node
                        </Button>
                        <Button variant="outline" className="w-full justify-start">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Transform
                        </Button>
                        <Button variant="outline" className="w-full justify-start">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Condition
                        </Button>
                    </div>
                </div>

                {/* Main Canvas */}
                <div className="flex-1">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onNodeClick={onNodeClick}
                        nodeTypes={nodeTypes}
                        fitView
                        className="bg-background"
                    >
                        <Background variant={BackgroundVariant.Dots} />
                        <Controls />
                        <MiniMap />
                    </ReactFlow>
                </div>

                {/* Right Sidebar - Node Configuration */}
                <div className="w-80 border-l bg-background p-4">
                    <NodeConfigPanel
                        node={selectedNode}
                        onConfigChange={(nodeId, newConfig) => {
                            setNodes((nds) =>
                                nds.map((node) => {
                                    if (node.id === nodeId) {
                                        return {
                                            ...node,
                                            data: {
                                                ...node.data,
                                                configuration: {
                                                    ...node.data.configuration,
                                                    ...newConfig,
                                                },
                                            },
                                        };
                                    }
                                    return node;
                                })
                            );
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default WorkflowCanvas;
