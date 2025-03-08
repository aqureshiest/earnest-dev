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

    // Set minimum threshold based on highest score
    const minThreshold = maxScore > 0.7 ? 0.4 : 0.35;

    // Take top 35% of the range from highest to lowest score
    const threshold = Math.max(
        minThreshold,
        maxScore - (maxScore - sortedFiles[sortedFiles.length - 1].similarity) * 0.35
    );

    return threshold;
}
