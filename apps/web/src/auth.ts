import { createHash, timingSafeEqual } from "node:crypto";
import { db, upsertUserFromLogin } from "@vocab/db";
import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

declare module "next-auth" {
  interface Session {
    user: { id: string; name: string; email: string };
  }
}

/**
 * Demo login as a seeded demo user:
 * - local development: AUTH_DEV_LOGIN=true (never honoured in production builds);
 * - hosted proof of concept (e.g. Vercel): DEMO_ACCESS_CODE set (min. 12 characters), and every
 *   sign-in must present that code.
 */
const localDevLogin = process.env.AUTH_DEV_LOGIN === "true" && process.env.NODE_ENV !== "production";
const demoAccessCode = process.env.DEMO_ACCESS_CODE?.trim() ?? "";
const hostedDemo = demoAccessCode.length >= 12;
export const devLoginEnabled = localDevLogin || hostedDemo;
export const demoCodeRequired = !localDevLogin && hostedDemo;

const digest = (value: string) => createHash("sha256").update(value).digest();
function validDemoCode(code: unknown): boolean {
  if (!demoCodeRequired) return true;
  return timingSafeEqual(digest(String(code ?? "")), digest(demoAccessCode));
}
export const entraEnabled = Boolean(process.env.AUTH_MICROSOFT_ENTRA_ID_ID);

const providers: NextAuthConfig["providers"] = [];
if (entraEnabled) {
  providers.push(
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
    }),
  );
}
if (devLoginEnabled) {
  providers.push(
    Credentials({
      id: "dev",
      name: "Demo user",
      credentials: { email: { label: "Email" }, code: { label: "Access code", type: "password" } },
      async authorize(credentials) {
        if (!validDemoCode(credentials?.code)) return null;
        const email = String(credentials?.email ?? "").toLowerCase();
        if (!email.endsWith("@demo.local")) return null;
        const user = await db().user.findUnique({ where: { email } });
        return user ? { id: user.id, email: user.email, name: user.name } : null;
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/signin" },
  trustHost: true,
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (account?.provider === "microsoft-entra-id" && profile) {
        // Entra sends `groups` only when the app registration emits the groups claim.
        const groups = (profile as { groups?: unknown }).groups;
        const u = await upsertUserFromLogin({
          email: String(
            profile.email ?? (profile as { preferred_username?: string }).preferred_username,
          ),
          name: String(profile.name ?? profile.email),
          entraOid: (profile as { oid?: string }).oid,
          groups: Array.isArray(groups) ? groups.map(String) : undefined,
        });
        token.uid = u.id;
      } else if (account?.provider === "dev" && user?.id) {
        await db().user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        token.uid = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (token.uid) session.user.id = String(token.uid);
      return session;
    },
  },
});
