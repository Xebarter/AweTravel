/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage public URLs, e.g. https://<project>.supabase.co/storage/v1/object/public/...
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/**',
      },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns', 'recharts'],
  },
}

export default nextConfig
