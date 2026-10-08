export type AppEnv = "production" | "test" | "development";

/**
 * Which environment this deployment is. APP_ENV wins; otherwise Vercel's VERCEL_ENV decides
 * (preview deployments, including the `test` branch, count as test).
 */
export function appEnv(env: Record<string, string | undefined> = process.env): AppEnv {
  const explicit = env.APP_ENV?.trim().toLowerCase();
  if (explicit === "production" || explicit === "test" || explicit === "development")
    return explicit;
  if (env.VERCEL_ENV === "production") return "production";
  if (env.VERCEL_ENV === "preview") return "test";
  return env.NODE_ENV === "production" ? "production" : "development";
}
