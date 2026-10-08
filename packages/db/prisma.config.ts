import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { defineConfig } from "prisma/config";

config({ path: fileURLToPath(new URL("../../.env", import.meta.url)), quiet: true });

// Migrations need a session connection: on Supabase set DIRECT_URL to the session pooler (port
// 5432); the app itself uses DATABASE_URL (transaction pooler). `prisma generate` needs neither.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL },
});
