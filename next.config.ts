import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // Allows Proxying to backend to avoid CORS if Env Vars are set to use Relative Paths
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

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
