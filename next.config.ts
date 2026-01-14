import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    ppr: true,
    clientSegmentCache: true,
  },
};

export default nextConfig;
