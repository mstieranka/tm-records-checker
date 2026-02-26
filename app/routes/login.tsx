import { data, LoaderFunctionArgs } from 'react-router';
import { Form, useLoaderData } from 'react-router';
import type { MetaFunction } from 'react-router';
import { isAuthenticated } from '~/services/auth.server';
import { commitSession, getSession } from '~/services/session.server';

export const meta: MetaFunction = () => {
  return [{ title: 'Login | TM Records Checker' }];
};

export default function Screen() {
  const loaderData = useLoaderData<{ error: any } | undefined>();

  return (
    <main className="container-fluid">
      {loaderData?.error ? (
        <p>{loaderData.error.message ?? loaderData.error}</p>
      ) : (
        <Form action="/auth/github" method="post">
          <button>Login with GitHub</button>
        </Form>
      )}
    </main>
  );
}

export async function loader({ request }: LoaderFunctionArgs) {
  let session = await getSession(request.headers.get('cookie'));
  let error = session.get('error');
  if (error) {
    return data(
      { error },
      {
        headers: {
          'Set-Cookie': await commitSession(session),
        },
      }
    );
  }

  return await isAuthenticated(request, {
    successRedirect: '/',
  });
}
