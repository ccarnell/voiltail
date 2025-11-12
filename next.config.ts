import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configure CSP headers for development
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: process.env.NODE_ENV === 'development' 
              ? "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://api.openai.com https://generativelanguage.googleapis.com https://api.anthropic.com;"
              : "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://api.openai.com https://generativelanguage.googleapis.com https://api.anthropic.com;"
          },
        ],
      },
    ];
  },
};

export default nextConfig;
