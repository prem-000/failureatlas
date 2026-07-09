// Clean up empty string environment variables to prevent build-time prerendering crashes (e.g. from NEXTAUTH_URL="")
const CRITICAL_URLS = [
  'NEXTAUTH_URL',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_API_URL',
  'APP_URL',
  'BASE_URL',
  'API_URL'
];

for (const key of CRITICAL_URLS) {
  if (process.env[key] === '') {
    delete process.env[key];
  }
}

// Fall back NEXTAUTH_URL to a valid default if it remains undefined during build
if (!process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = 'http://localhost:3000';
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;