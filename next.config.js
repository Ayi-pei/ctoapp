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
    remotePatterns: [],
  },
  devIndicators: {
    reloadOnOnline: false,
  },
};

// Trigger rebuild to fix missing routes-manifest.json
module.exports = nextConfig;
