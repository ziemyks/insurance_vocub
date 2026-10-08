import { describe, expect, it } from "vitest";
import { appEnv } from "./env";

describe("appEnv", () => {
  it("prefers an explicit APP_ENV", () => {
    expect(appEnv({ APP_ENV: "TEST", VERCEL_ENV: "production" })).toBe("test");
  });

  it("maps Vercel environments", () => {
    expect(appEnv({ VERCEL_ENV: "production" })).toBe("production");
    expect(appEnv({ VERCEL_ENV: "preview" })).toBe("test");
  });

  it("falls back to NODE_ENV", () => {
    expect(appEnv({ NODE_ENV: "development" })).toBe("development");
    expect(appEnv({ NODE_ENV: "production" })).toBe("production");
  });
});
