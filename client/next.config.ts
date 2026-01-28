import type { NextConfig } from "next";
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: false, // ✅ ALWAYS ENABLE
});

const nextConfig: NextConfig = {
  reactStrictMode: false,
};

export default withPWA(nextConfig);
