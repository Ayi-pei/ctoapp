/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_ADMIN_NAME: process.env.ADMIN_NAME,
    NEXT_PUBLIC_ADMIN_KEY: process.env.ADMIN_KEY,
    NEXT_PUBLIC_ADMIN_AUTH: process.env.ADMIN_AUTH,
  }
};

module.exports = nextConfig;
