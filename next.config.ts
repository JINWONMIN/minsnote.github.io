import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/minsnote.github.io",
  assetPrefix: "/minsnote.github.io/",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
