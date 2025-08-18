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
        hostname: 'assets.coingecko.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'static.coinpaprika.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
  devIndicators: {
    reloadOnOnline: false,
  },
};

// Trigger rebuild to fix missing routes-manifest.json
module.exports = nextConfig;
