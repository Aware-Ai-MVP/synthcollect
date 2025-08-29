import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  
  // CRITICAL: Export performance configuration for large ZIP files
  experimental: {
    serverActions: {
    },
  },
  
  // Enable output optimization for serverless deployment
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  
  // Optimize for better performance
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
  
  // Custom webpack config for better streaming support
  webpack: (config, { dev, isServer }) => {
    if (!dev && isServer) {
      // Optimize server bundles for large file handling
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          archiver: {
            name: 'archiver',
            chunks: 'all',
            test: /[\\/]node_modules[\\/](archiver|archive-stream)[\\/]/,
            enforce: true,
          },
        },
      };
    }
    return config;
  },
};

export default nextConfig;