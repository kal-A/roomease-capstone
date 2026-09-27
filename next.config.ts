import type { NextConfig } from "next";

if (process.env.NODE_ENV === "production" && process.env.ROOM_EASE_DEMO_MODE === "true") {
  throw new Error("ROOM_EASE_DEMO_MODE cannot be enabled in production.");
}

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
};

export default nextConfig;
