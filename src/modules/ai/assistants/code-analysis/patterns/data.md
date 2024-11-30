# Critical Data Management Patterns

1. **Data Synchronization Pattern**

    - Detection points:
        - Inconsistent data across components/stores
        - Missing optimistic updates
        - Race conditions in updates
        - Stale data handling
    - Critical violations:
        ```typescript
        // Critical: Inconsistent updates
        function updateUser(id: string, data: UserData) {
            await api.updateUser(id, data);
            queryClient.invalidateQueries(["users"]); // Full refresh
        }

        // Should use:
        function updateUser(id: string, data: UserData) {
            return queryClient.mutate({
                mutationFn: () => api.updateUser(id, data),
                onMutate: async (newData) => {
                    await queryClient.cancelQueries(["users", id]);
                    const previous = queryClient.getQueryData(["users", id]);
                    queryClient.setQueryData(["users", id], newData);
                    return { previous };
                },
                onError: (err, variables, context) => {
                    queryClient.setQueryData(["users", id], context.previous);
                },
            });
        }
        ```

2. **State Management Pattern**

    - Detection points:
        - Improper state colocation
        - Global state overuse
        - Unnecessary state duplication
        - Missing state normalization
    - Critical violations:
        ```typescript
        // Critical: State duplication
        const userStore = {
          user: User,
          userPosts: Post[],
          userComments: Comment[]
        }

        // Should normalize:
        const store = {
          entities: {
            users: Record<ID, User>,
            posts: Record<ID, Post>,
            comments: Record<ID, Comment>
          },
          relationships: {
            userPosts: Record<UserID, PostID[]>
          }
        }
        ```

3. **Data Fetching Strategy Pattern**

    - Detection points:
        - Missing data prefetching
        - Improper cache strategies
        - Unnecessary refetching
        - Missing background updates
    - Critical violations:
        ```typescript
        // Critical: Naive fetching strategy
        async function fetchData() {
            const response = await fetch("/api/data");
            return response.json();
        }

        // Should implement:
        const fetcher = {
            async get(key: string) {
                const cached = await cache.get(key);
                if (cached && !isStale(cached)) {
                    backgroundRefresh(key);
                    return cached.data;
                }
                return fetchAndCache(key);
            },
        };
        ```

4. **Data Consistency Pattern**

    - Detection points:
        - Missing data validation
        - Inconsistent data shapes
        - Type mismatches
        - Schema violations
    - Critical violations:
        ```typescript
        // Critical: Missing validation
        interface UserData {
            email?: string;
            age?: number;
        }

        // Should enforce:
        const UserSchema = z.object({
            email: z.string().email(),
            age: z.number().min(13).max(120),
        });

        type UserData = z.infer<typeof UserSchema>;
        ```

5. **Data Flow Control Pattern**
    - Detection points:
        - Bi-directional data flow
        - Prop drilling
        - Missing data boundaries
        - Unclear data ownership
    - Critical violations:
        ```typescript
        // Critical: Unclear data flow
        function ParentComponent() {
            const [data, setData] = useState();
            return children.map((child) => cloneElement(child, { data, setData }));
        }

        // Should establish clear boundaries:
        function DataProvider({ children }) {
            const [data, setData] = useState();
            const actions = {
                update: (newData) => {
                    /* validation logic */
                },
                reset: () => {
                    /* reset logic */
                },
            };

            return (
                <DataContext.Provider value={{ data, actions }}>{children}</DataContext.Provider>
            );
        }
        ```

Priority Assessment:

-   High:

    -   Data inconsistency issues
    -   Type safety violations
    -   Performance bottlenecks
    -   Race conditions

-   Medium:

    -   Code organization issues
    -   Minor data duplication
    -   Non-critical performance issues

-   Low:
    -   Style violations
    -   Optional optimizations

Critical Metrics:

1. Data Integrity:

    - Type safety coverage
    - Validation coverage
    - Schema conformance

2. Performance:

    - State update frequency
    - Cache hit rates
    - Data fetch patterns

3. Code Quality:
    - Data flow complexity
    - State management patterns
    - Error handling coverage

Tools Integration:

-   TypeScript strict mode
-   Schema validation (Zod/Yup)
-   State management DevTools
-   Query client DevTools
