# Critical React & TypeScript Performance Patterns

1. **Render Prevention Pattern**

    - Detection points:
        - Unnecessary parent re-renders cascading to children
        - Expensive calculations in render cycle
        - Heavy components without memoization
    - Critical violations:
        ```typescript
        // Critical: Expensive recalculation on every render
        function ExpensiveList({ items }: Props) {
            const processedItems = items.map((item) => heavyProcessing(item));
            return <>{processedItems.map(/*...*/)}</>;
        }

        // Should use:
        function ExpensiveList({ items }: Props) {
            const processedItems = useMemo(
                () => items.map(heavyProcessing),
                [items] // Only recompute when items change
            );
        }
        ```

2. **Large List Virtualization Pattern**

    - Detection points:
        - Rendering large lists (>50 items) without virtualization
        - DOM overload from too many nodes
        - Scroll performance issues
    - Critical violations:
        ```typescript
        // Critical: Rendering all items at once
        function LargeList({ items }: Props) {
            return items.map((item) => <Row key={item.id} {...item} />);
        }

        // Should use virtualization:
        import { VirtualList } from "@virtual/list";
        function LargeList({ items }: Props) {
            return (
                <VirtualList data={items} overscan={2} renderItem={(item) => <Row {...item} />} />
            );
        }
        ```

3. **Data Fetch Management Pattern**

    - Detection points:
        - Redundant API calls
        - Missing data caching
        - Waterfall requests
    - Critical violations:
        ```typescript
        // Critical: Redundant fetches & no caching
        function UserData({ userId }: Props) {
            const [data, setData] = useState<User>();
            useEffect(() => {
                fetchUser(userId).then(setData);
            }, [userId]);
        }

        // Should use proper caching:
        function UserData({ userId }: Props) {
            const { data } = useQuery({
                queryKey: ["user", userId],
                queryFn: () => fetchUser(userId),
                staleTime: 60_000,
            });
        }
        ```

4. **Bundle Loading Pattern**

    - Detection points:
        - Large initial bundle size (>250KB)
        - Unoptimized third-party imports
        - Missing route-based code splitting
    - Critical violations:
        ```typescript
        // Critical: Large synchronous imports
        import { massive } from "massive-lib";

        // Should use:
        const MassiveFeature = lazy(() => import("./features/MassiveFeature"));
        ```

5. **State Access Pattern**
    - Detection points:
        - Monolithic global state causing full re-renders
        - Inefficient context usage triggering unnecessary updates
        - Missing selector patterns for large state
    - Critical violations:
        ```typescript
        // Critical: Massive context causing re-renders
        const { user, settings, theme, ...rest } = useContext(GlobalContext);

        // Should split contexts:
        function Component() {
            const user = useSelector(selectUser);
            const theme = useSelector(selectTheme);
        }
        ```

Priority Focus:

-   User-perceivable performance issues
-   Memory leaks and escalating memory usage
-   CPU-intensive operations blocking the main thread
-   Network efficiency and payload size
-   Time to Interactive (TTI) impact

Metrics that Matter:

-   Longest Task duration (>50ms is problematic)
-   Memory growth patterns
-   Network payload size
-   React render counts in critical paths
-   Core Web Vitals (LCP, FID, CLS)
