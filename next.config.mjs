/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
    env: {
        NEXT_PUBLIC_GITHUB_OWNER: process.env.NEXT_PUBLIC_GITHUB_OWNER,
    },
};

export default nextConfig;
