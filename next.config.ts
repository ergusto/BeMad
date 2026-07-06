import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a self-contained server build for a lean, non-root Docker runtime (AD-12).
  output: "standalone",
};

export default nextConfig;
