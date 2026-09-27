import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained build for uploading to a Node.js host (Plesk, cPanel, VPS).
  output: "standalone",
};

export default nextConfig;
