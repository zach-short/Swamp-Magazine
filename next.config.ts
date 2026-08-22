import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Supabase Storage public objects (BD-6: everything reaching a page is a
    // resized WebP served through next/image). Wildcard because the project
    // ref doesn't exist yet; tighten to the real hostname at P5 cutover.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
