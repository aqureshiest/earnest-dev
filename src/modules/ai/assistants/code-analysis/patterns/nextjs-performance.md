# Critical Next.js Performance Patterns

1. **Data Fetching Pattern**

    - App Router Detection:
        - Missing parallel data fetching
        - Improper use of fetch caching options
        - Unnecessary waterfall requests
        - Misuse of server components
    - Critical violations:

        ```typescript
        // Critical: Waterfall requests in server component
        async function Page() {
            const user = await fetchUser();
            const posts = await fetchUserPosts(user.id); // Waterfall

            return <Component user={user} posts={posts} />;
        }

        // Should use:
        async function Page() {
            const userPromise = fetchUser();
            const postsPromise = fetchUserPosts(); // Parallel
            const [user, posts] = await Promise.all([userPromise, postsPromise]);
        }
        ```

    - Pages Router Detection:
        - Inefficient getServerSideProps usage
        - Missing Incremental Static Regeneration
        - Improper SWR/React Query implementation
    - Critical violations:
        ```typescript
        // Critical: Unnecessary SSR for static data
        export async function getServerSideProps() {
            const staticData = await fetchStaticContent();
            return { props: { staticData } };
        }

        // Should use:
        export async function getStaticProps() {
            const staticData = await fetchStaticContent();
            return {
                props: { staticData },
                revalidate: 3600, // ISR
            };
        }
        ```

2. **Route Optimization Pattern**

    - App Router Detection:
        - Missing route segments
        - Improper loading.tsx usage
        - Inefficient parallel routes
        - Missing streaming patterns
    - Critical violations:
        ```typescript
        // Critical: Missing streaming for slow components
        async function Page() {
            const slowData = await fetchSlowData();
            return <SlowComponent data={slowData} />;
        }

        // Should use:
        import { Suspense } from "react";

        function Page() {
            return (
                <Suspense fallback={<Loading />}>
                    <SlowComponent />
                </Suspense>
            );
        }
        ```

3. **Static/Dynamic Pattern**

    - Detection points:
        - Unnecessary dynamic rendering
        - Missing static page exports
        - Improper cache usage
        - Misuse of force-dynamic
    - Critical violations:
        ```typescript
        // Critical: Dynamic rendering for static content
        export const dynamic = "force-dynamic";

        // Should use segment config:
        export const revalidate = 3600; // Static with ISR

        // Or for mixed content:
        export const dynamic = "auto";
        ```

4. **Image Optimization Pattern**

    - Detection points:
        - Missing next/image usage
        - Improper priority attributes
        - Missing image sizing
        - Unoptimized image formats
    - Critical violations:
        ```typescript
        // Critical: Unoptimized images
        <img src="/large-hero.jpg" />;

        // Should use:
        import Image from "next/image";

        <Image src="/large-hero.jpg" alt="Hero" priority fill sizes="100vw" quality={85} />;
        ```

5. **Client-Side Navigation Pattern**

    - Detection points:
        - Missing prefetch patterns
        - Improper next/link usage
        - Unnecessary full page loads
        - Router event mismanagement
    - Critical violations:
        ```typescript
        // Critical: Missing prefetch for critical paths
        function Navigation() {
            return (
                <Link href="/dashboard" prefetch={false}>
                    Dashboard
                </Link>
            );
        }

        // Should prefetch critical paths:
        <Link href="/dashboard">Dashboard</Link>;
        ```

6. **Server/Client Component Pattern**
    - Detection points:
        - Unnecessary client components
        - Improper 'use client' directives
        - Inefficient component boundaries
        - State management misplacement
    - Critical violations:
        ```typescript
        // Critical: Client component with static content
        "use client";

        function StaticContent() {
            return <div>{staticData}</div>;
        }

        // Should be server component:
        function StaticContent() {
            return <div>{staticData}</div>;
        }
        ```

Priority Metrics:

-   TTFB (Time to First Byte)
-   FCP (First Contentful Paint)
-   LCP (Largest Contentful Paint)
-   TTI (Time to Interactive)
-   Bundle size per route
-   Server response time

Critical Detection Areas:

1. Build Output Analysis:

    - Large page sizes
    - Excessive JavaScript
    - Route segment size

2. Runtime Performance:

    - Hydration delays
    - Navigation speeds
    - Data fetching patterns

3. Server Performance:
    - Edge function efficiency
    - API route response times
    - Server component render time

Tools to Integrate:

-   next/bundle-analyzer
-   Chrome Performance tab
-   Next.js trace output
-   Core Web Vitals measurement
