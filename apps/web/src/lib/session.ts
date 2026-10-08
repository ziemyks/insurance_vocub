import "server-only";
import { getActor, getUser } from "@vocab/db";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";

/** The signed-in user and their permissions, or a redirect to sign-in. Cached per request. */
export const requireUser = cache(async () => {
  const session = await auth();
  const id = session?.user?.id;
  const user = id ? await getUser(id) : null;
  if (!user) redirect("/signin");
  const actor = await getActor(user.id);
  return { user, actor };
});

/** Same as requireUser for API routes: returns null instead of redirecting. */
export async function apiUser() {
  const session = await auth();
  const id = session?.user?.id;
  const user = id ? await getUser(id) : null;
  return user ? { user, actor: await getActor(user.id) } : null;
}
