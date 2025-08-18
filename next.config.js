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
        hostname: 'static.coinpaprika.com',
      },
      {
        protocol: 'https',
        hostname: 'assets.coingecko.com',
      },
    ],
  },
  devIndicators: {
    reloadOnOnline: false,
  },
};

// Trigger rebuild to fix missing routes-manifest.json
module.exports = nextConfig;
