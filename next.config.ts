import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  experimental: {
    scrollRestoration: true,
  },
  allowedDevOrigins: ["*", "10.191.99.203", "10.251.238.203", "172.22.147.203", "localhost"],
  serverExternalPackages: ["better-sqlite3", "ffmpeg-static", "ffprobe-static"],
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol:"https",
        hostname:"*"
      },
      {
        protocol: "https",
        hostname: "m.media-amazon.com",
      },
      {
        protocol: "http",
        hostname: "ia.media-imdb.com",
      },
      {
        protocol: "https",
        hostname: "image.tmdb.org",
      },
      {
        protocol: "https",
        hostname: "static.tvmaze.com",
      },
    ],
  },
  // Suppress Turbopack/NFT dynamic filesystem warning for browse-fs route
  // turbopack: {
  //   ignoreIssue: [
  //     {
  //       path: "app/api/browse-fs/route.ts",
  //       title: "Encountered unexpected file in NFT list",
  //     },
  //     {
  //       path: "next.config.ts",
  //       title: "Encountered unexpected file in NFT list",
  //     },
  // },
  webpack: (config, { isServer }) => {
    return config;
  },
};

export default nextConfig;
