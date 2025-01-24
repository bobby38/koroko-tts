/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Disable image optimization since we're using Replicate API
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
