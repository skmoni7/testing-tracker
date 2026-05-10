import type { NextConfig } from 'next'

// When BUILD_APK=true (set in GitHub Actions), use static export for Capacitor.
// Otherwise use default Next.js config for Vercel web deployment.
const isApkBuild = process.env.BUILD_APK === 'true'

const nextConfig: NextConfig = {
  ...(isApkBuild && {
    output: 'export',
    trailingSlash: true,
    images: { unoptimized: true },
  }),
  reactStrictMode: true,
}

export default nextConfig
