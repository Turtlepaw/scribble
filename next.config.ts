import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [new URL("https://cdn.bsky.app/img/feed_fullsize/**")],
  },
};

export default nextConfig;
