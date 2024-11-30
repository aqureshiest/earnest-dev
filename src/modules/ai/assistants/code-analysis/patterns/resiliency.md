# Service Resiliency Patterns

## Circuit Breaker Pattern

-   Detection points:
    -   Missing failure thresholds
    -   Lack of state tracking (Closed/Open/Half-Open)
    -   No recovery time settings
    -   Missing health checks
-   Implementation guidance:
    -   Use established libraries like `opossum`
    -   Configure appropriate timeouts and thresholds for your use case

## Retry Pattern

-   Detection points:
    -   Missing retry policies
    -   No exponential backoff
    -   Lack of max retry limits
    -   Missing retry timing configuration
-   Implementation guidance:
    -   Use retry libraries like `retry-ts` or `axios-retry`
    -   Implement exponential backoff with max attempts

## Bulkhead Pattern

-   Detection points:
    -   Unbounded resource pools
    -   Missing thread/connection limits
    -   No resource isolation between services
    -   Shared resources without boundaries
-   Implementation guidance:
    -   Use connection pooling libraries like `tarn.js` or `generic-pool`
    -   Set appropriate pool sizes and timeouts
    -   Always release connections in finally blocks
    -   Implement proper error handling for resource cleanup

## Rate Limiting Pattern

-   Detection points:
    -   Missing request throttling
    -   No rate limit configurations
    -   Lack of token bucket implementation
    -   Missing concurrent request limits
-   Implementation guidance:
    -   Use rate limiting libraries like `rate-limiter-flexible` or `bottleneck`
    -   Consider both global and per-user limits

## Timeout Pattern

-   Detection points:
    -   Missing timeout configurations
    -   Infinite waiting operations
    -   No deadline propagation
    -   Missing timeout hierarchy
-   Implementation guidance:
    -   Use AbortController for fetch operations
    -   Set appropriate timeouts for your environment
    -   Consider cascading timeout strategies

## Health Check Pattern

-   Detection points:
    -   Missing health endpoints
    -   No readiness checks
    -   Lack of dependency health monitoring
    -   Missing custom health metrics
-   Implementation guidance:
    -   Add /health endpoint with dependency checks
    -   Use libraries like `@godaddy/terminus` for graceful shutdowns

## Priority Guidelines

-   High: Missing pattern could lead to cascade failures
-   Medium: Pattern implemented but needs enhancement
-   Low: Pattern could improve resiliency but not critical
