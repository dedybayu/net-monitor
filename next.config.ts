import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['novnc-next', '@maxmind/geoip2-node'],
};

export default nextConfig;
