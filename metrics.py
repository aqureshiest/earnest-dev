import json
import subprocess
import datetime

# Constants
NAMESPACE = "EarnestAITools/Metrics"  # Replace with your namespace
START_TIME = (
    datetime.datetime.utcnow() - datetime.timedelta(hours=1)
).isoformat() + "Z"
END_TIME = datetime.datetime.utcnow().isoformat() + "Z"
REGION = "us-east-1"  # Change as needed
OUTPUT_FILE = "cloudwatch_metrics.json"


def run_cli_command(command):
    """Runs an AWS CLI command and returns the output as JSON."""
    try:
        result = subprocess.run(
            command, shell=True, check=True, capture_output=True, text=True
        )
        return json.loads(result.stdout)
    except subprocess.CalledProcessError as e:
        print(f"Error executing command: {command}")
        print(e.output)
        return None


def list_metrics():
    """Lists all CloudWatch metrics in the given namespace."""
    command = f"aws cloudwatch list-metrics --namespace {NAMESPACE} --region {REGION}"
    return run_cli_command(command).get("Metrics", [])


def get_metric_data(metric_name, dimensions):
    """Fetches metric statistics for a given metric."""
    dimensions_arg = json.dumps(dimensions) if dimensions else "[]"

    command = (
        f"aws cloudwatch get-metric-statistics --namespace {NAMESPACE} "
        f"--metric-name {metric_name} --start-time {START_TIME} --end-time {END_TIME} "
        f"--period 60 --statistics Average --region {REGION} "
        f"--dimensions '{dimensions_arg}'"
    )

    return run_cli_command(command).get("Datapoints", [])


def main():
    """Main function to fetch and compile CloudWatch metric data."""
    metrics = list_metrics()
    compiled_data = []

    for metric in metrics:
        metric_name = metric["MetricName"]
        dimensions = metric.get("Dimensions", [])

        print(f"Fetching data for metric: {metric_name} with dimensions: {dimensions}")

        data_points = get_metric_data(metric_name, dimensions)
        compiled_data.append(
            {
                "MetricName": metric_name,
                "Dimensions": dimensions,
                "DataPoints": data_points,
            }
        )

    # Save to file
    with open(OUTPUT_FILE, "w") as f:
        json.dump(compiled_data, f, indent=4)

    print(f"Metrics data saved to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
