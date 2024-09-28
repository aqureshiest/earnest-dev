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
    X,
    PenTool,
    Layers,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { calculateTotalEffort } from "@/modules/utils/calculateEffort";
import { Button } from "@/components/ui/button";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@radix-ui/react-tooltip";
import TechnicalDetailsRenderer from "./TechnicalDetailsRenderer";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";

const priorityColors: Record<Ticket["priority"], string> = {
    High: "bg-red-500",
    Medium: "bg-yellow-500",
    Low: "bg-green-500",
};

const complexityColors: Record<Ticket["estimatedComplexity"], string> = {
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
    const MinimalDetails = () => (
        <div className="flex flex-wrap gap-2 mt-4 sm:hidden">
            <Badge className={priorityColors[ticket.priority]}>{ticket.priority}</Badge>
            <Badge className={complexityColors[ticket.estimatedComplexity]}>
                {ticket.estimatedComplexity}
            </Badge>
            <Badge variant="outline">Effort: {ticket.effort}</Badge>
        </div>
    );

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[1200px] max-h-[90vh]  p-0 flex flex-col">
                <DialogHeader className="px-6 py-4 bg-gray-100 dark:bg-gray-800">
                    <DialogTitle className="text-2xl font-bold flex items-center gap-x-2">
                        <Badge
                            variant="outline"
                            className="text-gray-700 border-gray-700 dark:text-gray-300 dark:border-gray-300"
                        >
                            Ticket
                        </Badge>
                        {ticket.title}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-grow px-6 py-4 overflow-y-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="sm:col-span-2 space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-xl font-semibold flex items-center">
                                        <PenTool className="w-5 h-5 mr-2" />
                                        Description
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p>{ticket.description}</p>
                                    <MinimalDetails />
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-xl font-semibold flex items-center">
                                        <Layers className="w-5 h-5 mr-2" />
                                        Technical Details
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <TechnicalDetailsRenderer details={ticket.technicalDetails} />
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-xl font-semibold flex items-center">
                                        <ListTodo className="w-5 h-5 mr-2" />
                                        Steps
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ol className="list-decimal list-inside">
                                        {ticket.steps.map((step, index) => (
                                            <li key={index} className="mb-2">
                                                {step}
                                            </li>
                                        ))}
                                    </ol>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-xl font-semibold flex items-center">
                                        <FileText className="w-5 h-5 mr-2" />
                                        Affected Files
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400">
                                        {ticket.affectedFiles.map((file, index) => (
                                            <li key={index} className="mb-2">
                                                {file}
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-xl font-semibold flex items-center">
                                        <AlertTriangle className="w-5 h-5 mr-2" />
                                        Risks and Challenges
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <TechnicalDetailsRenderer details={ticket.risksAndChallenges} />
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-6 hidden sm:block">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-xl font-semibold flex items-center">
                                        <Clock className="w-5 h-5 mr-2" />
                                        Details
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <h4 className="font-semibold mb-1">Priority</h4>
                                        <Badge className={priorityColors[ticket.priority]}>
                                            {ticket.priority}
                                        </Badge>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold mb-1">Complexity</h4>
                                        <Badge
                                            className={complexityColors[ticket.estimatedComplexity]}
                                        >
                                            {ticket.estimatedComplexity}
                                        </Badge>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold mb-1">Effort</h4>
                                        <p className="text-sm">{ticket.effort}</p>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold mb-1">Dependencies</h4>
                                        <p className="text-sm">{ticket.dependencies || "None"}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 bg-gray-100 dark:bg-gray-800 mt-auto">
                    <Button onClick={onClose} className="w-full">
                        Close
                    </Button>
                </div>
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
    const { total: totalEffort, metric: effortMetric } = calculateTotalEffort(tickets);

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
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center text-gray-600 dark:text-gray-300">
                            <Clock className="w-4 h-4 mr-1" />
                            <span className="text-sm font-medium">
                                {totalEffort.toFixed(1)} {effortMetric}
                            </span>
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
                            <div className="mb-2">
                                <h4 className="font-semibold mb-2 mt-4">Technical Details:</h4>
                                {/* <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400"> */}
                                <TechnicalDetailsRenderer details={epic.technicalDetails} />
                                {/* </ul> */}
                            </div>
                            <div className="mt-4">
                                <h4 className="font-semibold mb-2">
                                    <Badge
                                        variant="outline"
                                        className="text-gray-700 border-gray-700 dark:text-gray-300 dark:border-gray-300"
                                    >
                                        Tickets ({tickets.length})
                                    </Badge>
                                </h4>
                                <table className="w-full">
                                    <tbody>
                                        {tickets.map((ticket, i) => (
                                            <tr key={i} className="border-t">
                                                <td className="py-2">
                                                    <div className="font-medium">
                                                        {i + 1}. {ticket.title}
                                                    </div>
                                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                                        {ticket.description}
                                                    </div>
                                                </td>
                                                <td className="text-right">
                                                    <Button
                                                        onClick={() => setSelectedTicket(ticket)}
                                                        variant="outline"
                                                        size="sm"
                                                    >
                                                        View Details
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-4">
                                <div className="font-semibold mb-2 text-xs">
                                    Affected Components:
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {epic.affectedComponents?.map((component, i) => (
                                        <Badge key={i} variant="outline">
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
    epics: EpicWithTickets[];
}

const EpicDisplay: React.FC<EpicDisplayProps> = ({ epics }) => {
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
                    Generated Epics and Tickets
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
                {epics.map((_epic, index) => {
                    const epic = _epic.epic;
                    const tickets = _epic.tickets;
                    const isExpanded = expandedEpics[index] || false;

                    return (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                        >
                            <EpicCard
                                epic={epic}
                                tickets={tickets}
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

export default EpicDisplay;
