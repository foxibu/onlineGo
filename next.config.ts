import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Disable Turbopack for build (Korean path characters cause Turbopack crash)
  output: 'standalone',
  basePath: '/onlineGo',
};

export default nextConfig;
