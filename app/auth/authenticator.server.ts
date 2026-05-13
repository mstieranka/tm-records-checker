import { redirect } from "react-router";
import { Authenticator } from "remix-auth";
import { GitHubStrategy } from "remix-auth-github";
import { getSetting } from "~/settings/server";
import type { User } from "~/auth/types";
import { AUTH_ERROR_KEY, commitSession, getUserSession } from "~/auth/session.server";

export async function getAuthenticator() {
  const [clientId, clientSecret, baseUrl, allowedUsers, userAgent] = await Promise.all([
    getSetting("github.clientId"),
    getSetting("github.clientSecret"),
    getSetting("base.url"),
    getSetting("github.allowedUsers"),
    getSetting("api.userAgent"),
  ]);

  const authenticator = new Authenticator<User>();
  authenticator.use(
    new GitHubStrategy<User>(
      {
        clientId: clientId ?? "",
        clientSecret: clientSecret ?? "",
        redirectURI:
          process.env.NODE_ENV === "development"
            ? "http://localhost:3000/auth/callback"
            : `${baseUrl}/auth/callback`,
      },
      async ({ tokens }) => {
        const res = await fetch("https://api.github.com/user", {
          headers: {
            Authorization: `Bearer ${tokens.accessToken()}`,
            Accept: "application/vnd.github+json",
            "User-Agent": userAgent ?? "tm-records-checker",
          },
        });
        if (!res.ok) {
          throw new Error(`GitHub user fetch failed: ${res.status}`);
        }
        const profile = (await res.json()) as { login: string };
        if (!(allowedUsers ?? []).includes(profile.login)) {
          throw new Error('User not allowed, check the "allowedUsers" setting.');
        }
        return { username: profile.login };
      },
    ),
  );
  return authenticator;
}

export async function authenticateOAuth(request: Request, strategy: "github"): Promise<never> {
  const authenticator = await getAuthenticator();
  try {
    const user = await authenticator.authenticate(strategy, request);
    const session = await getUserSession(request);
    session.set("user", user);
    throw redirect("/", {
      headers: { "Set-Cookie": await commitSession(session) },
    });
  } catch (err) {
    if (err instanceof Response) throw err;
    const session = await getUserSession(request);
    session.flash(AUTH_ERROR_KEY, {
      message: err instanceof Error ? err.message : "Authentication failed",
    });
    throw redirect("/login", {
      headers: { "Set-Cookie": await commitSession(session) },
    });
  }
}
