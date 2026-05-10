import { isRouteErrorResponse, useLoaderData, useRouteError } from "react-router";
import type { Route } from "./+types/records.$ingameId";
import { getMapInfo } from "~/models/maps.server";
import { requireUser } from "~/auth/session.server";
import { formatTime, formatTimestamp } from "~/utils";
import { MapExternalLinks } from "~/components/MapExternalLinks";
import { MapThumbnail } from "~/components/MapThumbnail";
import { PageContainer } from "~/components/PageContainer";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

export const meta: Route.MetaFunction = ({ loaderData }) => {
  if (!loaderData || "error" in loaderData) {
    return [{ title: "Error | TM Records Checker" }];
  }
  return [
    {
      title: `${loaderData.mapInfo?.tmxName ?? loaderData.mapInfo?.ingameName} | TM Records Checker`,
    },
  ];
};

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireUser(request);
  return { mapInfo: await getMapInfo(params.ingameId) };
}

export default function MapRecords() {
  const data = useLoaderData<typeof loader>();
  const map = data.mapInfo;

  if (!map) {
    return (
      <PageContainer>
        <Alert variant="destructive">
          <AlertTitle>Map not found</AlertTitle>
        </Alert>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="flex flex-col-reverse gap-6 md:flex-row md:items-start mb-8">
        <div className="flex-1 flex flex-col gap-3 text-sm">
          <h1 className="font-heading text-2xl font-semibold">{map.tmxName ?? map.ingameName}</h1>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <dt className="text-muted-foreground">Author time</dt>
            <dd>{formatTime(map.authorTimeMs)}</dd>
            <dt className="text-muted-foreground">Uploaded at</dt>
            <dd>{formatTimestamp(map.uploadedAt)}</dd>
            {map.updatedAt !== map.uploadedAt && (
              <>
                <dt className="text-muted-foreground">Updated at</dt>
                <dd>{formatTimestamp(map.updatedAt)}</dd>
              </>
            )}
          </dl>
          <MapExternalLinks tmxId={map.tmxId} ingameId={map.ingameId} />
        </div>
        <MapThumbnail
          tmxId={map.tmxId}
          name={map.tmxName ?? map.ingameName}
          className="w-full md:w-48"
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Player</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Discovered at</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {map.records.map((record, idx) => (
            <TableRow key={record.playerName}>
              <TableCell>{idx + 1}</TableCell>
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

export function ErrorBoundary() {
  const error = useRouteError();

  let title = "Error";
  let description: string | undefined;

  if (isRouteErrorResponse(error)) {
    title = error.data?.error ?? `Error ${error.status}`;
    description = `Status ${error.status}`;
  } else if (error instanceof Error) {
    description = error.message;
  }

  return (
    <PageContainer>
      <Alert variant="destructive">
        <AlertTitle>{title}</AlertTitle>
        {description && <AlertDescription>{description}</AlertDescription>}
      </Alert>
    </PageContainer>
  );
}
