import { LoaderFunctionArgs } from 'react-router';
import { logout } from '~/services/auth.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await logout(request, '/login');
}
