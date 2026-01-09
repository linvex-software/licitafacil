import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@licitafacil/shared", "@licitafacil/ui"],
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;

