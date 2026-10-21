/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Lets the browser morph shared elements across routes — the desk agent
    // shrinking from the home portrait into the top bar is one continuous
    // element, not a crossfade of two.
    viewTransition: true,
  },
  async rewrites() {
    return [{ source: '/api/crm/v1/:path*', destination: '/api/crm/:path*' }]
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
