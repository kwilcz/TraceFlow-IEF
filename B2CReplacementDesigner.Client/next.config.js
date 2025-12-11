/** @type {import('next').NextConfig} */
const nextConfig = {
    // Next.js is optimized for Vercel the default build output will not work on Azure
    // we need standalone build output to run on Azure
    output: "standalone",

    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    eslint: {
        ignoreDuringBuilds: true,
    },
    experimental: {
        serverActions: {
            bodySizeLimit: '10mb',
        },
    },
}

module.exports = nextConfig
