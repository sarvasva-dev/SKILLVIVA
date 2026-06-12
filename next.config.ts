import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.3", "localhost", "127.0.0.1", "tasty-regions-refuse.loca.lt", "*.loca.lt"]
} as any;

export default nextConfig;