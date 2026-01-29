import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compress: true, // Enable Gzip compression
  poweredByHeader: false, // Security/Performance: Remove X-Powered-By
  // swcMinify: true, // Default in Next.js 13+ (Speedy Web Compiler)

  // Experimental/Advanced features
  experimental: {
    // optimizeCss: true, // DISABLED: Requires 'critters' package, causing build stability issues.
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
        ],
      },
    ];
  },

  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'https://backend-49yx.onrender.com';

    return [
      {
        source: '/con/:path*',
        destination: `${backendUrl}/con/:path*`,
      },
      // Proxy routes if needed, but 'con' is the main API prefix
    ];
  },
};

export default nextConfig;
