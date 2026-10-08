import { describe, expect, it } from "vitest";
import { poolConfig } from "./client";

const url = "postgresql://u:p@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require";

describe("poolConfig", () => {
  it("uses the URL as-is and a larger pool locally", () => {
    expect(poolConfig(url, {})).toEqual({ connectionString: url, max: 10 });
  });

  it("keeps the pool small on Vercel unless overridden", () => {
    expect(poolConfig(url, { VERCEL: "1" }).max).toBe(3);
    expect(poolConfig(url, { VERCEL: "1", DATABASE_POOL_MAX: "5" }).max).toBe(5);
  });

  it("verifies the server certificate when a CA is given", () => {
    const cfg = poolConfig(`${url}&uselibpqcompat=true`, {
      DATABASE_CA_CERT: "-----BEGIN CERTIFICATE-----\\nabc\\n-----END CERTIFICATE-----",
    });
    expect(cfg.ssl).toEqual({
      ca: "-----BEGIN CERTIFICATE-----\nabc\n-----END CERTIFICATE-----",
      rejectUnauthorized: true,
    });
    expect(cfg.connectionString).toBe(
      "postgresql://u:p@aws-0-eu-central-1.pooler.supabase.com:6543/postgres",
    );
  });
});
