import type { LoaderFunctionArgs } from '@remix-run/node';
import { redirect } from '@remix-run/node';
import { authenticator } from '~/services/auth.server';

export async function loader() {
  return redirect('/login');
}

export async function action({ request }: LoaderFunctionArgs) {
  return authenticator.authenticate('github', request);
}
