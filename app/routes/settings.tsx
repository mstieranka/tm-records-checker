import { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
} from '@remix-run/react';
import { useState } from 'react';
import { EyeIcon, EyeOffIcon, ReloadIcon, SaveIcon } from '~/assets/Icons';
import { getConfig, reloadConfig, saveConfig } from '~/core/config.server';
import { authenticator } from '~/services/auth.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await authenticator.isAuthenticated(request, {
    failureRedirect: '/login',
  });

  return getConfig();
}

export async function action({ request }: ActionFunctionArgs) {
  await authenticator.isAuthenticated(request, {
    failureRedirect: '/login',
  });

  const formData = await request.formData();
  const action = formData.get('action');

  console.log('Action:', action);

  switch (action) {
    case 'reload': {
      console.log('Reloading config');
      await reloadConfig();
      return { success: true };
    }
    case 'save': {
      const config = JSON.parse(formData.get('config') as string);
      console.log('Saving config');
      await saveConfig(config);
      return { success: true };
    }
    default:
      return { success: false };
  }
}

export default function Settings() {
  const config = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [showConfig, setShowConfig] = useState(false);

  return (
    <main className="container">
      <Form method="post" style={{ margin: '1rem auto' }}>
        <div className="flex-desktop gap middle">
          <h1 style={{ flexGrow: '1', flexShrink: '1', flexBasis: '0' }}>
            Settings
          </h1>
          <div className="grid flex-grow" style={{ marginBottom: '1rem' }}>
            <button
              className="outline flex gap middle mb-0"
              type="button"
              onClick={() => setShowConfig(!showConfig)}
            >
              {showConfig ? (
                <>
                  <EyeOffIcon /> Hide config
                </>
              ) : (
                <>
                  <EyeIcon /> Show config
                </>
              )}
            </button>
            <button
              className="outline flex gap middle mb-0"
              type="submit"
              name="action"
              value="reload"
              style={{ flexGrow: 0 }}
            >
              <ReloadIcon /> Reload config
            </button>
            <button
              className="outline flex gap middle mb-0"
              type="submit"
              name="action"
              value="save"
              style={{ flexGrow: 0 }}
            >
              <SaveIcon /> Save and reload
            </button>
          </div>
        </div>

        {navigation.formData !== undefined ? (
          <p style={{ marginBottom: '1rem' }}>Waiting for server response...</p>
        ) : (
          actionData !== undefined && (
            <p style={{ marginBottom: '1rem' }}>
              <strong>Success:</strong> {actionData.success ? 'Yes' : 'No'}
            </p>
          )
        )}

        <div style={{ marginBottom: '1rem' }}>
          <textarea
            id="config"
            name="config"
            defaultValue={JSON.stringify(config, null, 2)}
            style={{
              fontFamily: 'monospace',
              height: '70vh',
              filter: showConfig ? '' : 'blur(0.5rem)',
            }}
          />
        </div>
      </Form>
    </main>
  );
}
