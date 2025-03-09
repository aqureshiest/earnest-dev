export function displayTime(startTime: number, endTime: number) {
    const timeTaken = endTime - startTime;
    const seconds = timeTaken / 1000;
    const minutes = seconds / 60;
    const hours = minutes / 60;

    if (hours >= 1) {
        return `${hours.toFixed(2)} hrs`;
    } else if (minutes >= 1) {
        return `${minutes.toFixed(2)} mins`;
    } else {
        return `${seconds.toFixed(2)} secs`;
    }
}
