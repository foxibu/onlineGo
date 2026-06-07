import type { NextConfig } from 'next';

const BASE_PATH = '/onlineGo';

const nextConfig: NextConfig = {
  // Disable Turbopack for build (Korean path characters cause Turbopack crash)
  output: 'standalone',
  basePath: BASE_PATH,
  env: {
    NEXT_PUBLIC_BASE_PATH: BASE_PATH,
  },
};

export default nextConfig;
