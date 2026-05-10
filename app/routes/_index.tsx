import { Link, useLoaderData } from "react-router";
import type { Route } from "./+types/_index";
import { getLatestRecords } from "~/models/records.server";
import { requireUser } from "~/auth/session.server";
import { formatTime, formatTimestamp } from "~/utils";
import { PageContainer } from "~/components/PageContainer";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

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
    <PageContainer>
      <h1 className="font-heading text-2xl font-semibold mb-6">Latest records</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Map</TableHead>
            <TableHead>#</TableHead>
            <TableHead>Player</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Discovered at</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => (
            <TableRow key={record.id}>
              <TableCell>
                <Link
                  to={`/records/${record.mapId}`}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {record.mapName}
                </Link>
              </TableCell>
              <TableCell>{record.position}</TableCell>
              <TableCell>{record.playerName}</TableCell>
              <TableCell>{formatTime(record.timeMs)}</TableCell>
              <TableCell>{formatTimestamp(record.timestamp)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </PageContainer>
  );
}
