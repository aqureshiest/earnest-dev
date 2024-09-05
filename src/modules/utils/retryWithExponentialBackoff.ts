export async function retryWithExponentialBackoff<T>(
    fn: () => Promise<T>,
    retries: number = 3,
    delay: number = 3000, // Increased initial delay (2 seconds)
    factor: number = 3 // Increased exponential factor
): Promise<T> {
    let attempt = 0;

    while (attempt < retries) {
        try {
            // Try executing the function
            return await fn();
        } catch (error) {
            attempt++;

            // If we've exhausted retries, throw the error
            if (attempt === retries) {
                throw error;
            }

            // Increase the delay more aggressively
            const backoffDelay = delay * Math.pow(factor, attempt) * (1 + Math.random()); // More jitter
            console.warn(`Retrying... attempt ${attempt}, waiting ${Math.ceil(backoffDelay)}ms`);

            // Wait for the backoff delay before retrying
            await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        }
    }

    // Fallback return (will not be reached due to retries logic)
    throw new Error("Retries exhausted");
}
