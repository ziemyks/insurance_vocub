import { config } from "dotenv";
import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

// Local development reads the repository-root .env; deployed environments set real env vars.
config({ path: fileURLToPath(new URL("../../.env", import.meta.url)), quiet: true });

const nextConfig: NextConfig = {
  // Self-contained server bundle for Azure App Service (node apps/web/server.js).
  output: "standalone",
  outputFileTracingRoot: fileURLToPath(new URL("../../", import.meta.url)),
  transpilePackages: ["@vocab/core", "@vocab/db"],
  serverExternalPackages: ["exceljs", "pg", "@prisma/client", "@prisma/adapter-pg"],
  poweredByHeader: false,
  // Excel imports are uploaded through a server action (the app caps files at 10 MB).
  experimental: { serverActions: { bodySizeLimit: "11mb" } },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
