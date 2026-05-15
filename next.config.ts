import type { NextConfig } from 'next'

const config: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  images: {
    // Wildcard sous-domaines fal.media : observé en prod v3, v3b, cdn, etc.
    // Plutôt que d'énumérer, on couvre toute la famille.
    remotePatterns: [
      { protocol: 'https', hostname: '**.fal.media' },
      { protocol: 'https', hostname: 'fal.media' },
    ],
  },
}

export default config
