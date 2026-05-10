import { createCookieSessionStorage, redirect } from "react-router";
import type { User } from "~/auth/types";

export const AUTH_ERROR_KEY = "auth:error";
const USER_KEY = "user";

export let sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "_session",
    sameSite: "lax",
    path: "/",
    httpOnly: true,
    secrets: ["Q@5vY99z7XrVn4EyFXxSTks7B*X^2N!"],
    secure: process.env.NODE_ENV === "production",
  },
});

export let { getSession, commitSession, destroySession } = sessionStorage;

export async function getUserSession(request: Request) {
  return getSession(request.headers.get("cookie"));
}

export async function getUser(request: Request): Promise<User | undefined> {
  const session = await getUserSession(request);
  return session.get(USER_KEY) as User | undefined;
}

export async function requireUser(request: Request): Promise<User> {
  const user = await getUser(request);
  if (!user) {
    throw redirect("/login");
  }
  return user;
}

export async function setUserSession(request: Request, user: User) {
  const session = await getUserSession(request);
  session.set(USER_KEY, user);
  return session;
}
