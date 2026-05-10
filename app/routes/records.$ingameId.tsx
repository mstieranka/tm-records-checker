import { LoaderFunctionArgs, data } from "@remix-run/node";
import { isRouteErrorResponse, MetaFunction, useLoaderData, useRouteError } from "@remix-run/react";
import { getMapInfo } from "~/models/maps.server";
import { authenticator } from "~/services/auth.server";
import { formatTime, formatTimestamp } from "~/utils";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data || "error" in data) {
    return [{ title: "Error | TM Records Checker" }];
  }
  return [
    {
      title: `${data.mapInfo?.tmxName ?? data.mapInfo?.ingameName} | TM Records Checker`,
    },
  ];
};

export async function loader({ request, params }: LoaderFunctionArgs) {
  await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });

  if (!params.ingameId) {
    throw data({ error: "Missing map ID" }, { status: 400 });
  }

  return { mapInfo: await getMapInfo(params.ingameId) };
}

export default function MapRecords() {
  const data = useLoaderData<typeof loader>();
  const map = data.mapInfo;
  if (!map) {
    return (
      <main className="container">
        <h1>Map not found</h1>
      </main>
    );
  }
  return (
    <main className="container">
      <div
        className="flex-mobile"
        style={{
          display: "flex",
          paddingBottom: "1rem",
          gap: "1rem",
        }}
      >
        <div style={{ flexGrow: "1" }}>
          <header style={{ margin: "1rem 0" }}>
            <h1 style={{ margin: 0 }}>{map.tmxName ?? map.ingameName}</h1>
          </header>
          <p>
            <strong>Author time:</strong> {formatTime(map.authorTimeMs)}
          </p>
          <p>
            <strong>Uploaded at:</strong> {formatTimestamp(map.uploadedAt)}
          </p>
          {map.updatedAt !== map.uploadedAt && (
            <p>
              <strong>Updated at:</strong> {formatTimestamp(map.updatedAt)}
            </p>
          )}
          <p className="flex gap">
            <a className="block" href={`https://trackmania.exchange/maps/${map.tmxId}`}>
              TMX
            </a>
            <a className="block" href={`https://trackmania.io/#/leaderboard/${map.ingameId}`}>
              Trackmania.io
            </a>
          </p>
        </div>
        <img
          src={`https://trackmania.exchange/mapimage/${map.tmxId}`}
          style={{ height: "250px", objectFit: "contain" }}
        />
      </div>
      <div className="overflow-auto">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Time</th>
              <th>Discovered at</th>
            </tr>
          </thead>
          <tbody>
            {map.records.map((record, idx) => (
              <tr key={record.playerName}>
                <td>{idx + 1}</td>
                <td>{record.playerName}</td>
                <td>{formatTime(record.timeMs)}</td>
                <td>
                  {new Date(record.timestamp).toLocaleString("en-GB", {
                    day: "numeric",
                    month: "numeric",
                    year: "numeric",
                    hour12: false,
                    hour: "numeric",
                    minute: "numeric",
                    second: "numeric",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  if (isRouteErrorResponse(error)) {
    return (
      <main className="container">
        <h1>{error.data.error}</h1>
        <p>Error {error.status}</p>
      </main>
    );
  } else if (error instanceof Error) {
    return (
      <main className="container">
        <h1>Error</h1>
        <p>{error.message}</p>
      </main>
    );
  }
  return <h1>Unknown Error</h1>;
}
