import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'commons.wikimedia.org',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
      {
        protocol: 'https',
        hostname: 'api.weather.gov',
      },
      {
        protocol: 'https',
        hostname: 'forecast.weather.gov',
      },
    ],
  },
};

export default nextConfig;
