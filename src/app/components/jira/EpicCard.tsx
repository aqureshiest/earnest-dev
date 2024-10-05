import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import TechnicalDetailsRenderer from "../TechnicalDetailsRenderer";
import TicketModal from "./TicketModal";

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

interface EpicCardProps {
    epic: Epic;
    tickets: Ticket[];
    isExpanded: boolean;
    onToggle: () => void;
    tddContent: string;
    model: string;
    onUpdateTicket: (updatedTicket: Ticket) => void;
}

const EpicCard: React.FC<EpicCardProps> = ({
    epic,
    tickets,
    isExpanded,
    onToggle,
    tddContent,
    model,
    onUpdateTicket,
}) => {
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
                    tddContent={tddContent}
                    model={model}
                    onUpdateTicket={onUpdateTicket}
                />
            )}
        </Card>
    );
};

export default EpicCard;
