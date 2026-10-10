export type DemoLoginMode = "off" | "local" | "code" | "open";

/**
 * How sign-in as a seeded demo user works in this deployment:
 * - local: development with AUTH_DEV_LOGIN=true (never in production builds); no code;
 * - code:  DEMO_ACCESS_CODE set (min. 12 characters); every sign-in must present it;
 * - open:  DEMO_LOGIN=open; anyone with the URL may sign in as any demo user, including admin.
 *          Meant for a proof of concept holding test data only;
 * - off:   none of the above (company sign-in only).
 * A configured access code always takes precedence over "open".
 */
export function demoLoginMode(
  env: Record<string, string | undefined> = process.env,
): DemoLoginMode {
  if (env.AUTH_DEV_LOGIN === "true" && env.NODE_ENV !== "production") return "local";
  if ((env.DEMO_ACCESS_CODE?.trim().length ?? 0) >= 12) return "code";
  if (env.DEMO_LOGIN?.trim().toLowerCase() === "open") return "open";
  return "off";
}
