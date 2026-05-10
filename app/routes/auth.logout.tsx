import { redirect, type LoaderFunctionArgs } from "react-router";
import { destroySession, getUserSession } from "~/auth/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getUserSession(request);
  return redirect("/login", {
    headers: { "Set-Cookie": await destroySession(session) },
  });
}

export const action = loader;
