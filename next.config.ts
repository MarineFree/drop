import type { NextConfig } from 'next'

const config: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  images: {
    // fal.media : images générées par Flux Schnell, multi-sous-domaines.
    // Les photos uploadées par les patrons sont désormais servies same-origin
    // via /uploads/[...path] (cf. src/lib/storage/) → pas de remotePattern.
    remotePatterns: [
      { protocol: 'https', hostname: '**.fal.media' },
      { protocol: 'https', hostname: 'fal.media' },
    ],
  },
}

export default config
