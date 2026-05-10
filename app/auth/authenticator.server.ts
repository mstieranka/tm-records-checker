import { redirect } from "react-router";
import { Authenticator } from "remix-auth";
import { GitHubStrategy } from "remix-auth-github";
import { getConfig } from "~/core/config.server";
import { User } from "~/auth/types";
import { AUTH_ERROR_KEY, commitSession, getUserSession } from "~/auth/session.server";

export let authenticator = new Authenticator<User>();

let gitHubStrategy = new GitHubStrategy<User>(
  {
    clientId: getConfig().githubAuth.clientId,
    clientSecret: getConfig().githubAuth.clientSecret,
    redirectURI:
      process.env.NODE_ENV === "development"
        ? "http://localhost:3000/auth/callback"
        : `${getConfig().baseUrl}/auth/callback`,
  },
  async ({ tokens }) => {
    const res = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokens.accessToken()}`,
        Accept: "application/vnd.github+json",
        "User-Agent": getConfig().api.userAgent,
      },
    });
    if (!res.ok) {
      throw new Error(`GitHub user fetch failed: ${res.status}`);
    }
    const profile = (await res.json()) as { login: string };
    if (!getConfig().githubAuth.allowedUsers.includes(profile.login)) {
      throw new Error('User not allowed, check the "allowedUsers" property in the config file.');
    }
    return { username: profile.login };
  },
);

authenticator.use(gitHubStrategy);

export async function authenticateOAuth(request: Request, strategy: "github"): Promise<never> {
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
