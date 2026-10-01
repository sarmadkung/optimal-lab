import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sessions used to live at the top level; posts in social-content still link there
  async redirects() {
    return [
      { source: "/dsa-01", destination: "/tracks/dsa/two-sum", permanent: true },
      { source: "/next-token", destination: "/tracks/ai/next-token", permanent: true },
    ];
  },
};

export default nextConfig;
