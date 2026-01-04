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

  async rewrites() {
    // Allows Proxying to backend to avoid CORS if Env Vars are set to use Relative Paths
    // Hardcoded fallback to Ensure Cloud works even if Env Vars flake out
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'https://backend-49yx.onrender.com';

    return [
      {
        source: '/con/:path*',
        destination: `${backendUrl}/con/:path*`,
      },
      // Proxy 'diagnostics' or other routes if needed, but 'con' is the main API prefix
    ];
  },
};

export default nextConfig;
