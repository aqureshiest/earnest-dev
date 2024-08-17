export function displayTime(startTime: number, endTime: number) {
    const timeTaken = endTime - startTime;
    const seconds = timeTaken / 1000;
    const minutes = seconds / 60;
    const hours = minutes / 60;

    if (hours >= 1) {
        return `${hours.toFixed(2)} hours`;
    } else if (minutes >= 1) {
        return `${minutes.toFixed(2)} minutes`;
    } else {
        return `${seconds.toFixed(2)} seconds`;
    }
}
