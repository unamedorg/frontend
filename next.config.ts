import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/con/:path*',
        destination: 'http://localhost:8080/con/:path*',
      },
      // Proxy 'diagnostics' or other routes if needed, but 'con' is the main API prefix
    ];
  },
};

export default nextConfig;
