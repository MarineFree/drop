import type { NextConfig } from 'next'

const config: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  images: {
    // Wildcard sous-domaines fal.media (v3, v3b, cdn, etc.) + Vercel Blob Storage
    // pour les photos uploadées par les patrons.
    remotePatterns: [
      { protocol: 'https', hostname: '**.fal.media' },
      { protocol: 'https', hostname: 'fal.media' },
      { protocol: 'https', hostname: '**.public.blob.vercel-storage.com' },
    ],
  },
}

export default config
