import { Authenticator } from "remix-auth";
import { sessionStorage } from "~/services/session.server";
import { GitHubStrategy } from "remix-auth-github";
import { getConfig } from "~/core/config.server";
import { User } from "~/models/auth";

// Create an instance of the authenticator, pass a generic with what
// strategies will return and will store in the session
export let authenticator = new Authenticator<User>(sessionStorage);

let gitHubStrategy = new GitHubStrategy<User>(
  {
    clientId: getConfig().githubAuth.clientId,
    clientSecret: getConfig().githubAuth.clientSecret,
    redirectURI:
      process.env.NODE_ENV === "development"
        ? "http://localhost:3000/auth/callback"
        : `${getConfig().baseUrl}/auth/callback`,
  },
  async ({ profile }) => {
    console.log("profile", profile);
    if (!getConfig().githubAuth.allowedUsers.includes(profile.displayName)) {
      throw new Error('User not allowed, check the "allowedUsers" property in the config file.');
    }
    return { username: profile.displayName };
  },
);

authenticator.use(gitHubStrategy);
