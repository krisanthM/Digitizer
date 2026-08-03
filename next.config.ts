import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["172.18.2.72", "192.168.56.1", "localhost", "127.0.0.1"],
  serverExternalPackages: ['tesseract.js'],
};

export default nextConfig;
