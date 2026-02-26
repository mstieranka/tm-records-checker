import type { LoaderFunctionArgs } from 'react-router';
import { redirect } from 'react-router';
import { authenticator } from '~/services/auth.server';
import { sessionStorage } from '~/services/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    let user = await authenticator.authenticate('github', request);
    let session = await sessionStorage.getSession(
      request.headers.get('cookie')
    );
    session.set('user', user);
    return redirect('/', {
      headers: { 'Set-Cookie': await sessionStorage.commitSession(session) },
    });
  } catch (error) {
    if (error instanceof Response) throw error;
    let session = await sessionStorage.getSession(
      request.headers.get('cookie')
    );
    session.flash(
      'error',
      error instanceof Error ? error.message : 'Authentication failed'
    );
    return redirect('/login', {
      headers: { 'Set-Cookie': await sessionStorage.commitSession(session) },
    });
  }
}
