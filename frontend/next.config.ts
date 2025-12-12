import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack is now the default bundler in Next.js 16
  // Empty config silences the webpack compatibility warning
  turbopack: {},

  // Keep webpack config for fallback support (use with --webpack flag)
  webpack: (config, { isServer }) => {
    // Prevent webpack from bundling Node.js modules on client-side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        "fs/promises": false,
      };
    }
    return config;
  },
  images: {
    // Allow localhost and private IPs for development
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "kioskapi.gandom-perfume.ir",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "kioskapi.gandom-perfume.ir",
        pathname: "/media/**",
      },
      {
        protocol: "http",
        hostname: "82.115.26.133",
        port: "1337",
        pathname: "/uploads/**",
      },
      {
        protocol: "http",
        hostname: "82.115.26.133",
        port: "1337",
        pathname: "/media/**",
      },
      {
        protocol: "http",
        hostname: "192.168.1.19",
        port: "1337",
        pathname: "/uploads/**",
      },
      {
        protocol: "http",
        hostname: "192.168.1.19",
        port: "1337",
        pathname: "/media/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
        pathname: "/media/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/media/**",
      },
      {
        protocol: "http",
        hostname: "192.168.0.181",
        port: "8000",
        pathname: "/media/**",
      },
      {
        protocol: "http",
        hostname: "192.168.0.181",
        port: "8000",
        pathname: "/uploads/**",
      },
      {
        protocol: "http",
        hostname: "192.168.0.181",
        port: "8000",
        pathname: "/uploads/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "1337",
        pathname: "/uploads/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "1337",
        pathname: "/uploads/**",
      },
      {
        protocol: "http",
        hostname: "perfume-backend",
        port: "1337",
        pathname: "/uploads/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60,
  },
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
