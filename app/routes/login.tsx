import { json, LoaderFunctionArgs } from '@remix-run/node';
import { Form, MetaFunction, useLoaderData } from '@remix-run/react';
import { authenticator } from '~/services/auth.server';
import { commitSession, getSession } from '~/services/session.server';

export const meta: MetaFunction = () => {
  return [{ title: 'Login | TM Records Checker' }];
};

export default function Screen() {
  const data = useLoaderData<{ error: any } | undefined>();

  return (
    <main className="container-fluid">
      {data?.error ? (
        <p>{data.error.message}</p>
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

  return await authenticator.isAuthenticated(request, {
    successRedirect: '/',
  });
}
