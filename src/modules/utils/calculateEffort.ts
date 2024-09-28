interface EffortResult {
    total: number;
    metric: string;
}

const calculateTotalEffort = (tickets: Ticket[]): EffortResult => {
    let totalHours = 0;
    let totalPoints = 0;
    let hasHours = false;
    let hasPoints = false;

    tickets.forEach((ticket) => {
        const effortString = (ticket.effort + "").toLowerCase() || "";
        const effortValue = parseFloat(effortString) || 0;

        if (effortString.includes("hour") || effortString.includes("hr")) {
            totalHours += isNaN(effortValue) ? 0 : effortValue;
            hasHours = true;
        } else if (effortString.includes("point") || effortString.includes("pt")) {
            totalPoints += isNaN(effortValue) ? 0 : effortValue;
            hasPoints = true;
        } else if (!isNaN(effortValue)) {
            // If no unit is specified, assume it's hours
            totalHours += effortValue;
            hasHours = true;
        }
    });

    if (hasHours && !hasPoints) {
        return { total: totalHours, metric: "hours" };
    } else if (hasPoints && !hasHours) {
        return { total: totalPoints, metric: "points" };
    } else if (hasHours && hasPoints) {
        return { total: totalHours, metric: "hours (mixed)" };
    } else {
        return { total: 0, metric: "unknown" };
    }
};

export { calculateTotalEffort };
