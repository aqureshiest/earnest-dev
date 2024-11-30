# Critical API Design Patterns

1. **Resource Modeling Pattern**

    - Detection points:
        - Inconsistent resource naming
        - Missing resource relationships
        - Improper hierarchy
        - Unclear resource boundaries
    - Critical violations:
        ```typescript
        // Critical: Inconsistent/unclear resources
        /api/getUserData/:id
        /api/updateUserInfo
        /api/user-posts

        // Should follow:
        /api/users/:id
        /api/users/:id/posts
        PUT /api/users/:id
        ```

2. **Response Structure Pattern**

    - Detection points:
        - Inconsistent response formats
        - Missing error details
        - Improper status codes
        - Inconsistent data shapes
    - Critical violations:
        ```typescript
        // Critical: Inconsistent responses
        // Endpoint 1
        { data: { user: {} } }
        // Endpoint 2
        { user: {}, status: 'success' }

        // Should standardize:
        interface ApiResponse<T> {
          data: T;
          meta?: {
            page?: number;
            total?: number;
          };
          error?: {
            code: string;
            message: string;
            details?: unknown;
          };
        }
        ```

3. **Query Parameter Pattern**

    - Detection points:
        - Missing pagination
        - Improper filtering
        - Unclear sorting parameters
        - Missing search capabilities
    - Critical violations:
        ```typescript
        // Critical: Unstructured querying
        /api/users?search=john&sort=desc

        // Should structure:
        /api/users?
          page=1
          &limit=20
          &sort=lastName:desc,createdAt:asc
          &filter=role:admin,status:active
          &search=john
        ```

4. **Error Handling Pattern**

    - Detection points:
        - Generic error messages
        - Missing error codes
        - Inconsistent error formats
        - Improper status codes
    - Critical violations:
        ```typescript
        // Critical: Poor error handling
        throw new Error("Something went wrong");

        // Should use:
        class ApiError extends Error {
            constructor(
                public code: string,
                public status: number,
                message: string,
                public details?: unknown
            ) {
                super(message);
            }
        }

        throw new ApiError("USER_NOT_FOUND", 404, "User not found", { userId: requestedId });
        ```

5. **API Versioning Pattern**
    - Detection points:
        - Missing version strategy
        - Breaking changes
        - Inconsistent versioning
        - Poor backward compatibility
    - Critical violations:
        ```typescript
        // Critical: Unversioned breaking changes
        /api/users (changed response format)

        // Should version:
        /api/v1/users (original format)
        /api/v2/users (new format)

        // Or use header versioning:
        Accept: application/vnd.api+json;version=2.0
        ```

Priority Metrics:

-   High:

    -   Breaking changes
    -   Security issues
    -   Performance bottlenecks
    -   Data consistency

-   Medium:

    -   Documentation gaps
    -   Minor inconsistencies
    -   Optional parameters

-   Low:
    -   Style deviations
    -   Non-critical enhancements

Critical Detection Areas:

1. Response Format Analysis:

    ```typescript
    // Check for consistent structure
    interface BaseResponse<T> {
        data: T;
        meta: ResponseMeta;
        error?: ResponseError;
    }

    // Enforce consistent error format
    interface ResponseError {
        code: string;
        message: string;
        details?: Record<string, unknown>;
    }
    ```

2. URL Pattern Analysis:

    ```typescript
    // Resource pattern validation
    const validResourcePattern = /^\/api\/v[0-9]+\/[a-z-]+(?:\/[a-z-]+)*$/;

    // Query parameter validation
    interface QueryParams {
        page?: number;
        limit?: number;
        sort?: string;
        filter?: Record<string, string>;
    }
    ```

3. Method Usage Analysis:

    ```typescript
    // HTTP method validation
    const allowedMethods = {
        collection: ["GET", "POST"],
        resource: ["GET", "PUT", "PATCH", "DELETE"],
    };

    // Validate CRUD operations
    interface CrudOperations {
        create: "POST";
        read: "GET";
        update: "PUT" | "PATCH";
        delete: "DELETE";
    }
    ```

Implementation Guidelines:

1. REST Endpoints:

    - Use nouns for resources
    - Use plural for collections
    - Nest related resources
    - Use query params for filtering/sorting

2. GraphQL Schemas:

    - Define clear types
    - Use connections for pagination
    - Implement proper resolvers
    - Handle N+1 queries

3. Response Headers:

    - Proper content-type
    - Caching headers
    - Rate limiting info
    - API versioning

4. Status Codes:
    - 2xx for success
    - 4xx for client errors
    - 5xx for server errors
    - Specific codes for specific cases

Tools Integration:

-   OpenAPI/Swagger documentation
-   API testing frameworks
-   Performance monitoring
-   Error tracking systems
