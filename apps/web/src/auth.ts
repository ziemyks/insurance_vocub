import { db, upsertUserFromLogin } from "@vocab/db";
import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

declare module "next-auth" {
  interface Session {
    user: { id: string; name: string; email: string };
  }
}

/** Dev login as a seeded demo user. Refuses to switch on in production builds. */
export const devLoginEnabled =
  process.env.AUTH_DEV_LOGIN === "true" && process.env.NODE_ENV !== "production";
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
      credentials: { email: { label: "Email" } },
      async authorize(credentials) {
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
