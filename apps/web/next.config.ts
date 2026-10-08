import { config } from "dotenv";
import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

// Local development reads the repository-root .env; deployed environments set real env vars.
config({ path: fileURLToPath(new URL("../../.env", import.meta.url)), quiet: true });

const nextConfig: NextConfig = {
  // Vercel builds natively. BUILD_STANDALONE=true produces a self-contained server bundle
  // (node apps/web/server.js) for Azure App Service or containers.
  output: process.env.BUILD_STANDALONE === "true" ? "standalone" : undefined,
  outputFileTracingRoot: fileURLToPath(new URL("../../", import.meta.url)),
  // The production build type-checks app code only; tests are checked by `npm run typecheck`
  // and need test tooling (vitest, Playwright) that deployments don't install.
  typescript: { tsconfigPath: "tsconfig.build.json" },
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
