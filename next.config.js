/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    env: {
        NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001'
    },
    async rewrites() {
        return [
            {
                source: '/api/socket',
                destination: 'http://localhost:3001/api/socket'
            },
            {
                source: '/api/socket/:path*',
                destination: 'http://localhost:3001/api/socket/:path*'
            }
        ];
    },
};

module.exports = nextConfig;
