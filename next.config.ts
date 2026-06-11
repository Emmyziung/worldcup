import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    localPatterns: [
      {
        pathname: "/assets/**",
        search: "",
      },
      {
        pathname: "/api/image",
      },
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.thesportsdb.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "r2.thesportsdb.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
