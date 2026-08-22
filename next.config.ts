import type { NextConfig } from "next";

import { dials } from "./config/dials";

// The slot uploader posts a phone master through a server action, and Next
// caps action bodies at 1 MB by default. The ceiling is derived from the dial
// rather than written twice: a little headroom above it so an oversized file
// is refused by our own check, with a sentence the founder can act on, instead
// of by the framework with a generic 413.
const actionBodyLimitMb = Math.ceil(
  (dials.slotImageMaxUploadBytes * 1.2) / (1024 * 1024),
);

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
  // sharp is a native binary; bundling it breaks the resize at runtime. Listed
  // explicitly rather than trusting the framework's default externals.
  serverExternalPackages: ["sharp"],
  experimental: {
    serverActions: { bodySizeLimit: `${actionBodyLimitMb}mb` },
  },
};

export default nextConfig;
