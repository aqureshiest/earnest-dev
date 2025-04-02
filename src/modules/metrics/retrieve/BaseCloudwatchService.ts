import {
    CloudWatchClient,
    GetMetricDataCommand,
    GetMetricStatisticsCommand,
} from "@aws-sdk/client-cloudwatch";
import { MetricDataResult, TimeRange, TimeSeriesParams } from "./types";
import { METRICS_CONFIG } from "../generate/config";

export class BaseCloudWatchService {
    protected client: CloudWatchClient;
    protected namespace: string;

    constructor(namespace: string, region: string = process.env.AWS_REGION || "us-east-1") {
        this.client = new CloudWatchClient({ region });
        this.namespace = namespace;
    }

    protected async getMetricSum(
        metricName: string,
        dimensions: { Name: string; Value: string }[] = [],
        timeRange: TimeRange
    ): Promise<number> {
        const { startTime, endTime } = timeRange;

        try {
            if (METRICS_CONFIG.loggingEnabled) {
                console.log(`Fetching ${metricName} metric sum... Dimensions:`, dimensions);
            }

            const command = new GetMetricStatisticsCommand({
                Namespace: this.namespace,
                MetricName: metricName,
                Dimensions: dimensions.length > 0 ? dimensions : undefined,
                StartTime: startTime,
                EndTime: endTime,
                Period: 86400, // 1 day aggregation
                Statistics: ["Sum"],
            });

            const response = await this.client.send(command);

            let totalSum = 0;
            if (response.Datapoints) {
                for (const datapoint of response.Datapoints) {
                    if (datapoint.Sum !== undefined) {
                        totalSum += datapoint.Sum;
                    }
                }
            }

            if (METRICS_CONFIG.loggingEnabled) {
                console.log(`Fetched ${metricName} metric sum:`, totalSum);
            }

            return totalSum;
        } catch (error) {
            console.error(`Error fetching ${metricName} metrics:`, error);
            throw error;
        }
    }

    protected async getMetricAverage(
        metricName: string,
        dimensions: { Name: string; Value: string }[] = [],
        timeRange: TimeRange
    ): Promise<number> {
        const { startTime, endTime } = timeRange;

        try {
            if (METRICS_CONFIG.loggingEnabled) {
                console.log(`Fetching ${metricName} metric average... Dimensions:`, dimensions);
            }

            const command = new GetMetricStatisticsCommand({
                Namespace: this.namespace,
                MetricName: metricName,
                Dimensions: dimensions.length > 0 ? dimensions : undefined,
                StartTime: startTime,
                EndTime: endTime,
                Period: 86400, // 1 day aggregation
                Statistics: ["Average"],
            });

            const response = await this.client.send(command);

            if (!response.Datapoints || response.Datapoints.length === 0) {
                return 0;
            }

            if (METRICS_CONFIG.loggingEnabled) {
                console.log(`Fetched ${metricName} metric average:`, response.Datapoints);
            }

            // Calculate the average of all daily averages
            let totalAverage = 0;
            for (const datapoint of response.Datapoints) {
                if (datapoint.Average !== undefined) {
                    totalAverage += datapoint.Average;
                }
            }

            return totalAverage / response.Datapoints.length;
        } catch (error) {
            console.error(`Error fetching ${metricName} average:`, error);
            throw error;
        }
    }

    protected async getTimeSeriesData(params: TimeSeriesParams): Promise<MetricDataResult> {
        const {
            startTime,
            endTime,
            metricName,
            namespace,
            dimensions,
            stat,
            period,
            label = metricName,
        } = params;

        // Create a valid ID that meets AWS requirements: must start with a lowercase letter and contain only letters, numbers, and underscores
        const validId = `m${metricName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}`;

        if (METRICS_CONFIG.loggingEnabled) {
            console.log(`Fetching time series data for ${metricName}... Dimensions:`, dimensions);
        }

        const command = new GetMetricDataCommand({
            StartTime: startTime,
            EndTime: endTime,
            ScanBy: "TimestampAscending",
            MetricDataQueries: [
                {
                    Id: validId,
                    MetricStat: {
                        Metric: {
                            Namespace: namespace,
                            MetricName: metricName,
                            Dimensions: dimensions,
                        },
                        Period: period,
                        Stat: stat,
                    },
                    Label: label,
                    ReturnData: true,
                },
            ],
        });

        try {
            const response = await this.client.send(command);

            if (!response.MetricDataResults || response.MetricDataResults.length === 0) {
                return { label, values: [], timestamps: [] };
            }

            if (METRICS_CONFIG.loggingEnabled) {
                console.log(
                    `Fetched time series data for ${metricName}:`,
                    response.MetricDataResults
                );
            }

            const result = response.MetricDataResults[0];

            return {
                label: result.Label || label,
                values: result.Values || [],
                timestamps: result.Timestamps || [],
            };
        } catch (error) {
            console.error(`Error fetching time series data for ${metricName}:`, error);
            throw error;
        }
    }

    // Utility method to format time series data for the frontend
    protected formatTimeSeriesData(data: MetricDataResult): { date: string; value: number }[] {
        if (!data.timestamps || !data.values || data.timestamps.length === 0) {
            return [];
        }

        return data.timestamps.map((timestamp, index) => ({
            date: timestamp.toISOString().split("T")[0], // Format as YYYY-MM-DD
            value: data.values[index] || 0,
        }));
    }
}
