import React, { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    FileText,
    ListTodo,
    AlertTriangle,
    Clock,
    ChevronDown,
    ChevronUp,
    Grid,
    List,
    PenTool,
    Layers,
    CheckSquare,
    FileCode,
    GitBranch,
    Tag,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@radix-ui/react-tooltip";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import TechnicalDetailsRenderer from "./TechnicalDetailsRenderer";
import { Textarea } from "@/components/ui/textarea";
import { DialogClose } from "@radix-ui/react-dialog";

const priorityColors: Record<Ticket["priority"], string> = {
    High: "bg-red-500",
    Medium: "bg-yellow-500",
    Low: "bg-green-500",
};

const complexityColors: Record<string, string> = {
    High: "bg-purple-500",
    Medium: "bg-blue-500",
    Low: "bg-cyan-500",
};

interface TicketModalProps {
    ticket: Ticket;
    isOpen: boolean;
    onClose: () => void;
}

const TicketModal: React.FC<TicketModalProps> = ({ ticket, isOpen, onClose }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[80vw] w-full max-h-[80vh] p-0 overflow-auto">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="h-full flex flex-col"
                >
                    <DialogHeader className="p-6 bg-gray-100 dark:bg-gray-800 border-b">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <DialogTitle className="text-2xl">{ticket.title}</DialogTitle>
                                <Badge variant="outline">Ticket</Badge>
                            </div>
                            <Button variant="outline" onClick={onClose}>
                                Close
                            </Button>
                        </div>
                    </DialogHeader>
                    <div className="flex-grow overflow-y-auto">
                        <div className="flex flex-col md:flex-row h-full">
                            <div className="md:w-2/3 p-6 overflow-y-auto">
                                <Card className="mb-6">
                                    <CardHeader>
                                        <CardTitle className="text-xl flex items-center">
                                            <PenTool className="w-5 h-5 mr-2" />
                                            User Story
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p>{ticket.user_story}</p>
                                    </CardContent>
                                </Card>
                                <Card className="mb-6">
                                    <CardHeader>
                                        <CardTitle className="text-xl flex items-center">
                                            <FileText className="w-5 h-5 mr-2" />
                                            Description
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p>{ticket.description}</p>
                                    </CardContent>
                                </Card>
                                <Card className="mb-6">
                                    <CardHeader>
                                        <CardTitle className="text-xl flex items-center">
                                            <CheckSquare className="w-5 h-5 mr-2" />
                                            Acceptance Criteria
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="list-disc pl-5 space-y-2">
                                            {ticket.acceptance_criteria.criterion.map(
                                                (criterion, index) => (
                                                    <li key={index}>{criterion}</li>
                                                )
                                            )}
                                        </ul>
                                    </CardContent>
                                </Card>
                                <Card className="mb-6">
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center">
                                            <Layers className="w-5 h-5 mr-2" />
                                            Technical Details
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Textarea
                                            className="text-base"
                                            value={ticket.technical_details.detail.join("\n---\n")}
                                            rows={20}
                                            readOnly
                                        />
                                    </CardContent>
                                </Card>
                                <Card className="mb-6">
                                    <CardHeader>
                                        <CardTitle className="text-xl flex items-center">
                                            <ListTodo className="w-5 h-5 mr-2" />
                                            Steps
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ol className="list-decimal pl-5 space-y-2">
                                            {ticket.steps.step.map((step, index) => (
                                                <li key={index}>{step}</li>
                                            ))}
                                        </ol>
                                    </CardContent>
                                </Card>
                            </div>
                            <div className="md:w-1/3 bg-gray-50 dark:bg-gray-900 p-6 overflow-y-auto border-l">
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                                            Details
                                        </h3>
                                        <div className="space-y-2">
                                            <div className="flex items-center">
                                                <Tag className="w-4 h-4 mr-2" />
                                                <span className="text-sm">Priority: </span>
                                                <Badge
                                                    className={`ml-2 ${
                                                        priorityColors[ticket.priority]
                                                    }`}
                                                >
                                                    {ticket.priority}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center">
                                                <Layers className="w-4 h-4 mr-2" />
                                                <span className="text-sm">Complexity: </span>
                                                <Badge
                                                    className={`ml-2 ${
                                                        complexityColors[
                                                            ticket.estimated_complexity
                                                        ]
                                                    }`}
                                                >
                                                    {ticket.estimated_complexity}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center">
                                                <Clock className="w-4 h-4 mr-2" />
                                                <span className="text-sm">
                                                    Effort: {ticket.effort} {ticket.effortIn}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-lg flex items-center">
                                                <FileCode className="w-5 h-5 mr-2" />
                                                Affected Files
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <ul className="list-disc pl-5 space-y-1 text-sm">
                                                {ticket.affected_files.file.map((file, index) => (
                                                    <li key={index}>{file}</li>
                                                ))}
                                            </ul>
                                        </CardContent>
                                    </Card>
                                    {ticket.dependencies && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="text-lg flex items-center">
                                                    <GitBranch className="w-5 h-5 mr-2" />
                                                    Dependencies
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-sm">{ticket.dependencies}</p>
                                            </CardContent>
                                        </Card>
                                    )}
                                    {ticket.risks_and_challenges && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="text-lg flex items-center">
                                                    <AlertTriangle className="w-5 h-5 mr-2" />
                                                    Risks and Challenges
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-sm">
                                                    {ticket.risks_and_challenges}
                                                </p>
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </DialogContent>
        </Dialog>
    );
};

interface EpicCardProps {
    epic: Epic;
    tickets: Ticket[];
    isExpanded: boolean;
    onToggle: () => void;
}

const EpicCard: React.FC<EpicCardProps> = ({ epic, tickets, isExpanded, onToggle }) => {
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

    const totalEffort = tickets.reduce((sum, ticket) => sum + parseInt(ticket.effort), 0);
    // const maxEffort = Math.max(...tickets.map((ticket) => parseInt(ticket.effort)));

    return (
        <Card className="border-2 border-gray-400 overflow-hidden h-full flex flex-col">
            <CardHeader
                className="bg-blue-50 dark:bg-blue-900 cursor-pointer flex-shrink-0"
                onClick={onToggle}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Badge
                            variant="outline"
                            className="text-blue-700 border-blue-700 dark:text-blue-300 dark:border-blue-300"
                        >
                            EPIC
                        </Badge>
                        <CardTitle className="text-xl text-blue-700 dark:text-blue-300 truncate">
                            {epic.title}
                        </CardTitle>
                    </div>
                    <div className="items-center space-x-4 flex">
                        <div className="flex items-center text-gray-600 dark:text-gray-300">
                            <Clock className="w-4 h-4 mr-1" />
                            <span className="text-sm font-medium">Total Effort: {totalEffort}</span>
                        </div>
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                </div>
                <CardDescription className="mt-2 line-clamp-2">{epic.description}</CardDescription>
            </CardHeader>
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex-grow overflow-auto"
                    >
                        <CardContent>
                            <div className="mb-4 mt-4">
                                <h4 className="font-semibold mb-2">User Story:</h4>
                                <p>{epic.user_story}</p>
                            </div>
                            <div className="mb-4">
                                <h4 className="font-semibold mb-2">Technical Details:</h4>
                                <TechnicalDetailsRenderer details={epic.technical_details} />
                            </div>
                            <div className="mt-2 mb-4">
                                <h4 className="font-semibold mb-2">
                                    <Badge
                                        variant="outline"
                                        className="text-gray-700 border-gray-700 dark:text-gray-300 dark:border-gray-300"
                                    >
                                        Tickets ({tickets.length})
                                    </Badge>
                                </h4>
                                <div className="space-y-4 mt-4">
                                    {tickets.map((ticket, i) => (
                                        <Card key={i} className="p-4">
                                            <div className="flex justify-between items-center mb-2">
                                                <h5 className="font-medium">{ticket.title}</h5>
                                                <Button
                                                    onClick={() => setSelectedTicket(ticket)}
                                                    size="sm"
                                                >
                                                    View Details
                                                </Button>
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                                {ticket.description}
                                            </p>
                                            <div className="flex justify-between items-center">
                                                <div className="space-x-2">
                                                    <Badge
                                                        className={priorityColors[ticket.priority]}
                                                    >
                                                        {ticket.priority}
                                                    </Badge>
                                                    <Badge
                                                        className={
                                                            complexityColors[
                                                                ticket.estimated_complexity
                                                            ]
                                                        }
                                                    >
                                                        {ticket.estimated_complexity}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center">
                                                    <Clock className="w-3 h-3 mr-1" />
                                                    <span className="text-sm">
                                                        Effort: {ticket.effort} {ticket.effortIn}
                                                    </span>
                                                </div>
                                            </div>
                                            {/* <div className="mt-2">
                                                <Progress
                                                    value={
                                                        (parseInt(ticket.effort) / maxEffort) * 100
                                                    }
                                                />
                                            </div> */}
                                        </Card>
                                    ))}
                                </div>
                            </div>
                            <div className="">
                                <h4 className="font-semibold mb-2">Affected Components:</h4>
                                <div className="flex flex-wrap gap-2">
                                    {epic.affected_components.component.map((component, index) => (
                                        <Badge key={index} variant="outline">
                                            {component}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </motion.div>
                )}
            </AnimatePresence>
            {selectedTicket && (
                <TicketModal
                    ticket={selectedTicket}
                    isOpen={!!selectedTicket}
                    onClose={() => setSelectedTicket(null)}
                />
            )}
        </Card>
    );
};

interface EpicDisplayProps {
    jiraItems: JiraItems[];
}

const JiraItemsDisplay: React.FC<EpicDisplayProps> = ({ jiraItems }) => {
    const [expandedEpics, setExpandedEpics] = useState<Record<number, boolean>>({});
    const [viewMode, setViewMode] = useState<"list" | "grid">("list");

    const toggleEpicExpansion = useCallback((index: number) => {
        setExpandedEpics((prev) => ({
            ...prev,
            [index]: !prev[index],
        }));
    }, []);

    return (
        <div>
            <div className="mb-4 flex justify-between">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                    Epics and Tickets
                </h2>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setViewMode(viewMode === "list" ? "grid" : "list")}
                            >
                                {viewMode === "list" ? <Grid size={20} /> : <List size={20} />}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Switch to {viewMode === "list" ? "Grid" : "List"} View</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
            <div
                className={
                    viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-8"
                }
            >
                {jiraItems.map((item, index) => {
                    const isExpanded = expandedEpics[index] || false;

                    return (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                        >
                            <EpicCard
                                epic={item.epic}
                                tickets={item.tickets.ticket}
                                isExpanded={isExpanded}
                                onToggle={() => toggleEpicExpansion(index)}
                            />
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

export default JiraItemsDisplay;
