import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
    ],
  },
  async redirects() {
    return [
      { source: "/login", destination: "/auth/login", permanent: true },
      { source: "/forgot-password", destination: "/auth/forgot-password", permanent: true },
      { source: "/unauthorized", destination: "/auth/unauthorized", permanent: true },
      { source: "/proforma", destination: "/proforma-invoices", permanent: true },
      { source: "/proforma/:path*", destination: "/proforma-invoices/:path*", permanent: true },
      { source: "/settings/audit", destination: "/settings/audit-logs", permanent: true },
    ];
  },
};

export default nextConfig;
