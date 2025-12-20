/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@music-exam-builder/shared'],
  images: {
    domains: [
      'localhost',
      // Add your Supabase storage domain here
      // e.g., 'your-project.supabase.co'
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
}

module.exports = nextConfig

