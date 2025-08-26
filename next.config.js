/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  typescript: {
    // 开发环境忽略错误，生产环境启用检查
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
  },
  eslint: {
    // 开发环境忽略错误，生产环境启用检查
    ignoreDuringBuilds: process.env.NODE_ENV === 'development',
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
      {
        protocol: 'https',
        hostname: 'coin-images.coingecko.com',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
    ],
  },
  devIndicators: {
    reloadOnOnline: false,
  },
};

// Trigger rebuild to fix missing routes-manifest.json
module.exports = nextConfig;