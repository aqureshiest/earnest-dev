import React, { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Grid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@radix-ui/react-tooltip";
import EpicCard from "./EpicCard";

interface EpicDisplayProps {
    jiraItems: JiraItems[];
    setJiraItems: React.Dispatch<React.SetStateAction<JiraItems[]>>;
    tddContent: string;
    model: string;
}

const JiraEpicsDisplay: React.FC<EpicDisplayProps> = ({
    jiraItems,
    setJiraItems,
    tddContent,
    model,
}) => {
    const [expandedEpics, setExpandedEpics] = useState<Record<number, boolean>>({});
    const [viewMode, setViewMode] = useState<"list" | "grid">("list");

    const toggleEpicExpansion = useCallback((index: number) => {
        setExpandedEpics((prev) => ({
            ...prev,
            [index]: !prev[index],
        }));
    }, []);

    const onUpdateTicket = (updatedTicket: Ticket) => {
        // Update ticket in jira items
        console.log("Updated ticket:", updatedTicket);

        // update ticket in state
        const updatedJiraItems = jiraItems.map((item) => {
            const updatedTickets = item.tickets.ticket.map((ticket: Ticket) => {
                if (ticket.title === updatedTicket.title) {
                    return updatedTicket;
                }
                return ticket;
            });

            return {
                ...item,
                tickets: {
                    ticket: updatedTickets,
                },
            };
        });

        setJiraItems(updatedJiraItems);
    };

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
                                tddContent={tddContent}
                                model={model}
                                onUpdateTicket={onUpdateTicket}
                            />
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

export default JiraEpicsDisplay;
