import { useLoaderData } from "react-router";
import type { Route } from "./+types/_index";
import { getLatestRecords } from "~/models/records.server";
import { requireUser } from "~/auth/session.server";
import { formatTime, formatTimestamp } from "~/utils";

export const meta: Route.MetaFunction = () => {
  return [{ title: "Home | TM Records Checker" }];
};

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);

  return { records: await getLatestRecords() };
}

export default function Index() {
  const { records } = useLoaderData<typeof loader>();

  return (
    <main className="container">
      <h1>Home</h1>
      <h2>Latest records:</h2>
      <div className="overflow-auto">
        <table>
          <thead>
            <tr>
              <th>Map</th>
              <th>#</th>
              <th>Player</th>
              <th>Time</th>
              <th>Discovered at</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id}>
                <td>
                  <a href={`/records/${record.mapId}`}>{record.mapName}</a>
                </td>
                <td>{record.position}</td>
                <td>{formatTime(record.timeMs)}</td>
                <td>{record.playerName}</td>
                <td>{formatTimestamp(record.timestamp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
