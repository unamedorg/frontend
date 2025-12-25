import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
