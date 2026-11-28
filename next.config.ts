import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingExcludes: { "/api/songs/chord-model": ["./.local-models/**"] },
};

export default nextConfig;
