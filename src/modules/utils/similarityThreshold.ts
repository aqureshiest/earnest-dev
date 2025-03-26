export interface ScoredFile {
    path: string;
    similarity: number;
}

export function calculateSimilarityThreshold(files: ScoredFile[]): number {
    if (files.length === 0) return 0.4;

    // Sort files by similarity
    const sortedFiles = [...files].sort((a, b) => b.similarity - a.similarity);

    // Get highest score
    const maxScore = sortedFiles[0].similarity;

    // If the highest score is very low, we should still include some results
    if (maxScore < 0.35) {
        // When scores are low, use a relative approach to take at least the top files
        // This ensures we always return some results, even with poor matches
        const topN = Math.max(3, Math.ceil(files.length * 0.1)); // At least 3 files or top 10%
        return sortedFiles[Math.min(topN - 1, sortedFiles.length - 1)].similarity - 0.001;
    }

    // Dynamic threshold calculation for normal cases
    // Base threshold depends on the quality of the best match
    const baseThreshold = maxScore > 0.7 ? 0.4 : maxScore > 0.5 ? 0.35 : 0.25;

    // Dynamic range calculation - take top X% of the range from highest to lowest score
    // When max score is higher, we can be more selective
    const rangePercentage = maxScore > 0.7 ? 0.35 : 0.5;
    const dynamicThreshold =
        maxScore - (maxScore - sortedFiles[sortedFiles.length - 1].similarity) * rangePercentage;

    // Use the higher of base threshold or dynamic threshold, but never filter out the top result
    return Math.min(Math.max(baseThreshold, dynamicThreshold), maxScore - 0.001);
}
