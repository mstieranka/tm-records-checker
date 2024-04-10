import { MetaFunction, useLoaderData } from '@remix-run/react';
import { LoaderFunctionArgs, json } from '@remix-run/node';
import { getMaps } from '~/models/maps.server';
import { useState } from 'react';
import { authenticator } from '~/services/auth.server';
import { formatTime } from '~/utils';

export const meta: MetaFunction = () => {
  return [{ title: 'Maps | TM Records Checker' }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  await authenticator.isAuthenticated(request, {
    failureRedirect: '/login',
  });

  return json({ mapList: await getMaps() });
}

export default function Maps() {
  const data = useLoaderData<typeof loader>();
  const mapList = data.mapList ?? [];
  const [allCollapse, setAllCollapse] = useState(false);

  return (
    <main className="container">
      <header style={{ margin: '1rem 0' }}>
        <h1 style={{ margin: 0 }}>Maps:</h1>
        <button
          onClick={() => setAllCollapse(!allCollapse)}
          className="outline"
          style={{
            padding: '0 var(--pico-form-element-spacing-horizontal)',
          }}
        >
          {allCollapse ? 'Expand all' : 'Collapse all'}
        </button>
      </header>
      {mapList.length === 0 && <p>No maps found.</p>}
      {mapList.map((map) => (
        <details key={map.ingameId} open={!allCollapse}>
          <summary>{map.tmxName ?? map.ingameName}</summary>
          <div className="grid" style={{ gridTemplateColumns: '1fr 2fr' }}>
            <img
              src={`https://trackmania.exchange/maps/screenshot/normal/${map.tmxId}`}
            />
            <div>
              <p>
                <strong>Author time:</strong> {formatTime(map.authorTimeMs)}
              </p>
              {map.worldRecordTimeMs && (
                <p>
                  <strong>World record:</strong> {map.worldRecordPlayerName},{' '}
                  {formatTime(map.worldRecordTimeMs)}
                </p>
              )}
              <p>
                <a href={`/records/${map.ingameId}`}>See all records</a>
              </p>
              <hr />
              <p>
                <strong>Uploaded at:</strong>{' '}
                {new Date(map.uploadedAt).toLocaleString('en-US', {
                  dateStyle: 'long',
                  timeStyle: 'short',
                  hour12: false,
                })}
              </p>
              {map.updatedAt !== map.uploadedAt && (
                <p>
                  <strong>Updated at:</strong>{' '}
                  {new Date(map.updatedAt).toLocaleString('en-US', {
                    dateStyle: 'long',
                    timeStyle: 'short',
                    hour12: false,
                  })}
                </p>
              )}
              <p className="flex gap">
                <a
                  className="block"
                  href={`https://trackmania.exchange/maps/${map.tmxId}`}
                >
                  TMX
                </a>
                <a
                  className="block"
                  href={`https://trackmania.io/#/leaderboard/${map.ingameId}`}
                >
                  Trackmania.io
                </a>
              </p>
            </div>
          </div>
        </details>
      ))}
    </main>
  );
}
