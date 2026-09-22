import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Charity photos live in Supabase Storage's public charity-media bucket. A wildcard subdomain
    // (rather than the one project's exact host) means this never needs updating if the project changes.
    remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' }],
  },
};

export default nextConfig;
