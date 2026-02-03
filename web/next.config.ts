import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "data.riksdagen.se",
        pathname: "/filarkiv/bilder/**",
      },
    ],
  },
};

export default nextConfig;
