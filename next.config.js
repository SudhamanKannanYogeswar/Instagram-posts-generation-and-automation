/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['zydyaigtlvrylqkrbxhz.supabase.co', 'placehold.co'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Tell webpack not to bundle native Node addons — let Node require them at runtime
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : [config.externals].filter(Boolean)),
        '@napi-rs/canvas',
        'sharp',
        'ffmpeg-static',
      ]
    }
    // Ignore .node binary files in the webpack bundle
    config.module.rules.push({
      test: /\.node$/,
      use: 'node-loader',
    })
    return config
  },
}

module.exports = nextConfig
