import type { LinksFunction, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import {
  Form,
  Links,
  LiveReload,
  Meta,
  MetaFunction,
  Outlet,
  Scripts,
  useLoaderData,
} from '@remix-run/react';
import { User } from './models/auth';
import { authenticator } from './services/auth.server';
import { commitSession, getSession } from './services/session.server';

import appStylesHref from '@picocss/pico/css/pico.min.css';
import favicon16 from './assets/favicon-16x16.png';
import favicon192 from './assets/favicon-192x192.png';
import favicon32 from './assets/favicon-32x32.png';
import favicon96 from './assets/favicon-96x96.png';
import faviconIco from './assets/favicon.ico';
import customStyles from './root.css';

export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: appStylesHref },
  { rel: 'stylesheet', href: customStyles },
  {
    rel: 'icon',
    type: 'image/png',
    sizes: '16x16',
    href: favicon16,
  },
  {
    rel: 'icon',
    type: 'image/png',
    sizes: '32x32',
    href: favicon32,
  },
  {
    rel: 'icon',
    type: 'image/png',
    sizes: '96x96',
    href: favicon96,
  },
  {
    rel: 'icon',
    type: 'image/png',
    sizes: '192x192',
    href: favicon192,
  },
  { rel: 'shortcut icon', type: 'image/x-icon', href: faviconIco },
  { rel: 'icon', type: 'image/x-icon', href: faviconIco },
];

export async function loader({ request }: LoaderFunctionArgs) {
  let session = await getSession(request.headers.get('cookie'));
  let error = session.get(authenticator.sessionErrorKey);
  if (error) {
    return json(
      { error },
      {
        headers: {
          'Set-Cookie': await commitSession(session), // You must commit the session whenever you read a flash
        },
      }
    );
  }

  return json({
    auth: await authenticator.isAuthenticated(request),
  });
}

function NavLinks() {
  return (
    <>
      <li>
        <a href="/">Home</a>
      </li>
      <li>
        <a href="/maps">Maps</a>
      </li>
      <li>
        <a href="/tasks">Tasks</a>
      </li>
      <li>
        <a href="/settings">Settings</a>
      </li>
      <li>
        <a href="/auth/logout">Logout</a>
      </li>
    </>
  );
}

export default function Root() {
  const data = useLoaderData<{ auth?: User; error?: any }>();

  return (
    <html>
      <head>
        <link rel="icon" href="data:image/x-icon;base64,AA" />
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <nav className="container-fluid">
          <ul>
            <li>
              <a href="/">TM Records Checker</a>
            </li>
          </ul>
          {!!data.auth && (
            <>
              <ul className="mobile-only">
                <li>
                  <details className="dropdown">
                    <summary className="no-arrow">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="icon icon-tabler icon-tabler-menu"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                        <path d="M4 8l16 0" />
                        <path d="M4 16l16 0" />
                      </svg>
                    </summary>
                    <ul dir="rtl">
                      <NavLinks />
                    </ul>
                  </details>
                </li>
              </ul>
              <ul className="desktop-only">
                <NavLinks />
              </ul>
            </>
          )}
        </nav>
        <Outlet />
        {!!data.error && (
          <footer className="container-fluid">
            <hr />
            <Form action="/auth/logout" method="post">
              <button
                className="outline"
                style={{
                  border: 0,
                  padding: 0,
                  margin: 0,
                  fontSize: '0.75rem',
                }}
              >
                Logout
              </button>
            </Form>
          </footer>
        )}

        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
