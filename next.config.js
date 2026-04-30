/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['zydyaigtlvrylqkrbxhz.supabase.co'],
  },
  experimental: {
    serverActions: true,
  },
}

module.exports = nextConfig
