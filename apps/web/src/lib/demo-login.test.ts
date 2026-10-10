import { describe, expect, it } from "vitest";
import { demoLoginMode } from "./demo-login";

describe("demoLoginMode", () => {
  it("allows code-free login locally but never in production builds", () => {
    expect(demoLoginMode({ AUTH_DEV_LOGIN: "true", NODE_ENV: "development" })).toBe("local");
    expect(demoLoginMode({ AUTH_DEV_LOGIN: "true", NODE_ENV: "production" })).toBe("off");
  });

  it("requires a sufficiently long access code when one is set", () => {
    expect(demoLoginMode({ NODE_ENV: "production", DEMO_ACCESS_CODE: "long-enough-code" })).toBe(
      "code",
    );
    expect(demoLoginMode({ NODE_ENV: "production", DEMO_ACCESS_CODE: "short" })).toBe("off");
  });

  it("opens demo login only when explicitly requested", () => {
    expect(demoLoginMode({ NODE_ENV: "production", DEMO_LOGIN: "open" })).toBe("open");
    expect(demoLoginMode({ NODE_ENV: "production", DEMO_LOGIN: "yes" })).toBe("off");
  });

  it("lets an access code take precedence over open mode", () => {
    expect(
      demoLoginMode({
        NODE_ENV: "production",
        DEMO_LOGIN: "open",
        DEMO_ACCESS_CODE: "long-enough-code",
      }),
    ).toBe("code");
  });
});
