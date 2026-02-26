import { Authenticator } from 'remix-auth';
import { sessionStorage } from '~/services/session.server';
import { GitHubStrategy } from 'remix-auth-github';
import { getConfig } from '~/core/config.server';
import { User } from '~/models/auth';
import { redirect } from 'react-router';

// Create an instance of the authenticator, pass a generic with what
// strategies will return and will store in the session
export let authenticator = new Authenticator<User>();

let gitHubStrategy = new GitHubStrategy<User>(
  {
    clientId: getConfig().githubAuth.clientId,
    clientSecret: getConfig().githubAuth.clientSecret,
    redirectURI:
      process.env.NODE_ENV === 'development'
        ? 'http://127.0.0.1:3000/auth/callback'
        : `${getConfig().baseUrl}/auth/callback`,
  },
  async ({ tokens }) => {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${tokens.accessToken()}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    const profile = await response.json();
    console.log('profile', profile);
    if (!getConfig().githubAuth.allowedUsers.includes(profile.login)) {
      throw new Error(
        'User not allowed, check the "allowedUsers" property in the config file.'
      );
    }
    return { username: profile.login };
  }
);

authenticator.use(gitHubStrategy);

// Helper to check if user is authenticated
export async function isAuthenticated(
  request: Request,
  options?: { failureRedirect?: string; successRedirect?: string }
): Promise<User | null> {
  let session = await sessionStorage.getSession(
    request.headers.get('cookie')
  );
  let user = session.get('user') as User | undefined;

  if (user) {
    if (options?.successRedirect) {
      throw redirect(options.successRedirect);
    }
    return user;
  }

  if (options?.failureRedirect) {
    throw redirect(options.failureRedirect);
  }
  return null;
}

// Helper to logout
export async function logout(
  request: Request,
  redirectTo: string
) {
  let session = await sessionStorage.getSession(
    request.headers.get('cookie')
  );
  throw redirect(redirectTo, {
    headers: { 'Set-Cookie': await sessionStorage.destroySession(session) },
  });
}
