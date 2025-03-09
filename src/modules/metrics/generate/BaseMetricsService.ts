import { CloudWatchClient, PutMetricDataCommand, StandardUnit } from "@aws-sdk/client-cloudwatch";
import { MetricParams, METRICS_CONFIG } from "./config";

export abstract class BaseMetricsService {
    protected cloudWatch: CloudWatchClient;
    protected namespace: string;

    constructor() {
        this.cloudWatch = new CloudWatchClient({
            region: METRICS_CONFIG.region,
        });
        this.namespace = METRICS_CONFIG.namespace;
    }

    protected async trackMetric({
        name,
        value,
        dimensions = {},
        unit = StandardUnit.Count,
    }: MetricParams): Promise<void> {
        try {
            if (METRICS_CONFIG.loggingEnabled) {
                console.log(`Tracking metric: ${name}=${value}`);
            }

            const dimensionsArray = Object.entries(dimensions).map(([Name, Value]) => ({
                Name,
                Value,
            }));

            const command = new PutMetricDataCommand({
                Namespace: this.namespace,
                MetricData: [
                    {
                        MetricName: name,
                        Value: value,
                        Unit: unit,
                        Dimensions: dimensionsArray,
                        Timestamp: new Date(),
                    },
                ],
            });

            await this.cloudWatch.send(command);
        } catch (error) {
            // Silently fail - we don't want metrics to break the app
            if (METRICS_CONFIG.loggingEnabled) {
                console.error("Metrics error:", error);
            }
        }
    }
}
