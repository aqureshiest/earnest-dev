export async function retryWithExponentialBackoff<T>(
    fn: () => Promise<T>,
    context: string = "Operation",
    retries: number = 2,
    delay: number = 3000,
    factor: number = 3
): Promise<T> {
    let attempt = 0;
    const startTime = new Date();

    while (attempt < retries) {
        try {
            return await fn();
        } catch (error) {
            attempt++;
            const errorDetails = {
                context,
                attempt,
                error: error instanceof Error ? error : new Error(String(error)),
                timestamp: new Date(),
                timeSinceStart: `${(new Date().getTime() - startTime.getTime()) / 1000}s`,
            };

            console.error("Operation failed:", context, JSON.stringify(errorDetails, null, 2));

            if (attempt === retries) {
                throw new Error(`Failed after ${attempt} attempts: ${errorDetails.error.message}`);
            }

            const backoffDelay = delay * Math.pow(factor, attempt) * (1 + Math.random() * 0.2);
            console.warn(
                `Retrying ${context}... attempt ${attempt}, waiting ${Math.ceil(backoffDelay)}ms`
            );
            await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        }
    }

    throw new Error("Retries exhausted");
}
