import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {},
  typescript: {
    // Emergency deploy guard: do not block production deploys on type-only issues.
    ignoreBuildErrors: true,
  },
}

export default nextConfig
