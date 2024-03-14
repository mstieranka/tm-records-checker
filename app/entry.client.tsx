import { RemixBrowser } from '@remix-run/react';
import { startTransition, StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';

startTransition(() => {
  hydrateRoot(
    // @ts-expect-error
    document,
    <StrictMode>
      <RemixBrowser />
    </StrictMode>
  );
});
