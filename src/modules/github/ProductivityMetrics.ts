class ProductivityMetrics {
    calculateCommitFrequency(
        commits: CommitData[],
        author: string = "all",
        days: number = 30
    ): CommitFrequencyData[] {
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

        const frequencyMap: { [date: string]: number } = {};
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            frequencyMap[d.toISOString().split("T")[0]] = 0;
        }

        commits.forEach((commit) => {
            const commitDate = new Date(commit.date);
            if (commitDate >= startDate && commitDate <= endDate) {
                if (author === "all" || commit.author === author) {
                    const dateString = commitDate.toISOString().split("T")[0];
                    frequencyMap[dateString] = (frequencyMap[dateString] || 0) + 1;
                }
            }
        });

        return Object.entries(frequencyMap).map(([date, frequency]) => ({ date, frequency }));
    }

    calculatePullRequestMetrics(
        prs: PullRequestData[],
        username: string
    ): Omit<PRMetricsData, "developer"> {
        const userPRs = prs.filter((pr) => pr.author === username);
        const mergedPRs = userPRs.filter((pr) => pr.merged_at !== null);

        const frequency = userPRs.length;
        const averageSize =
            userPRs.reduce((sum, pr) => sum + pr.additions + pr.deletions, 0) / userPRs.length;
        const mergeRate = mergedPRs.length / userPRs.length;

        return {
            frequency,
            averageSize,
            mergeRate,
        };
    }

    calculateTeamVelocity(prs: PullRequestData[], days: number = 30): TeamVelocityData[] {
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

        const sprintDuration = 7; // Assuming 1-week sprints
        const sprints: TeamVelocityData[] = [];

        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + sprintDuration)) {
            const sprintEnd = new Date(d.getTime() + sprintDuration * 24 * 60 * 60 * 1000);
            const sprintPRs = prs.filter(
                (pr) =>
                    pr.merged_at &&
                    new Date(pr.merged_at) >= d &&
                    new Date(pr.merged_at) < sprintEnd
            );

            sprints.push({
                sprint: `Sprint ${sprints.length + 1}`,
                velocity: sprintPRs.length,
            });
        }

        return sprints;
    }

    calculateCollaborationMatrix(reviews: ReviewData[]): CollaborationMatrixData {
        const matrix: CollaborationMatrixData = {};

        reviews.forEach((review) => {
            if (!matrix[review.reviewer]) {
                matrix[review.reviewer] = {};
            }
            const author = review.pull_request_number.toString(); // Assuming this is the author, adjust as needed
            matrix[review.reviewer][author] = (matrix[review.reviewer][author] || 0) + 1;
        });

        return matrix;
    }

    calculatePRMergeFrequencyOverTime(
        prs: PullRequestData[],
        intervalDays: number = 7
    ): PRMergeFrequencyData[] {
        const mergedPRs = prs
            .filter((pr) => pr.merged_at !== null)
            .sort((a, b) => new Date(a.merged_at!).getTime() - new Date(b.merged_at!).getTime());

        if (mergedPRs.length === 0) return [];

        const frequencyOverTime: PRMergeFrequencyData[] = [];
        let currentDate = new Date(mergedPRs[0].merged_at!);
        const endDate = new Date(mergedPRs[mergedPRs.length - 1].merged_at!);

        while (currentDate <= endDate) {
            const intervalEnd = new Date(
                currentDate.getTime() + intervalDays * 24 * 60 * 60 * 1000
            );
            const count = mergedPRs.filter(
                (pr) =>
                    new Date(pr.merged_at!) >= currentDate && new Date(pr.merged_at!) < intervalEnd
            ).length;

            frequencyOverTime.push({
                date: currentDate.toISOString().split("T")[0],
                count: count,
            });

            currentDate = intervalEnd;
        }

        return frequencyOverTime;
    }

    calculateAverageCommentsPerPR(prs: PullRequestData[]): AverageCommentsPerPRData[] {
        const totalComments = prs.reduce((sum, pr) => sum + pr.review_comments, 0);
        const averageComments = totalComments / prs.length;

        return [{ name: "Average Comments", value: averageComments }];
    }

    identifyAreasOfExpertise(commits: CommitData[]): AreasOfExpertiseData {
        const expertiseMap: { [username: string]: { [file: string]: number } } = {};

        commits.forEach((commit) => {
            if (!expertiseMap[commit.author]) {
                expertiseMap[commit.author] = {};
            }
            commit.files_changed.forEach((file) => {
                expertiseMap[commit.author][file] = (expertiseMap[commit.author][file] || 0) + 1;
            });
        });

        const expertiseThreshold = 5; // Arbitrary threshold, adjust as needed
        const areasOfExpertise: AreasOfExpertiseData = {};

        Object.entries(expertiseMap).forEach(([username, files]) => {
            areasOfExpertise[username] = Object.entries(files)
                .filter(([_, count]) => count >= expertiseThreshold)
                .map(([file, _]) => file);
        });

        return areasOfExpertise;
    }
}

export default ProductivityMetrics;
