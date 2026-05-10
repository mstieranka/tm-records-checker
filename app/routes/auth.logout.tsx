import { redirect } from "react-router";
import type { Route } from "./+types/auth.logout";
import { destroySession, getUserSession } from "~/auth/session.server";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getUserSession(request);
  return redirect("/login", {
    headers: { "Set-Cookie": await destroySession(session) },
  });
}

export const action = loader;
