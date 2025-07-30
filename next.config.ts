import type { NextConfig } from "next";
import { setupDevPlatform } from '@cloudflare/next-on-pages/next-dev';

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [new URL("https://cdn.bsky.app/img/feed_fullsize/**")],
  },
};

 if (process.env.NODE_ENV === 'development') {
   await setupDevPlatform();
 }

export default nextConfig;
