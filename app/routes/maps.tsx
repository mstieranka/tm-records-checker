import { Link, useLoaderData } from "react-router";
import { useState } from "react";
import { IconChevronRight } from "@tabler/icons-react";
import type { Route } from "./+types/maps";
import { getMaps } from "~/models/maps.server";
import { requireUser } from "~/auth/session.server";
import { formatTime, formatTimestamp } from "~/utils";
import { cn } from "~/lib/utils";
import { MapExternalLinks } from "~/components/MapExternalLinks";
import { MapThumbnail } from "~/components/MapThumbnail";
import { PageContainer } from "~/components/PageContainer";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "~/components/ui/collapsible";
import { Separator } from "~/components/ui/separator";

export const meta: Route.MetaFunction = () => {
  return [{ title: "Maps | TM Records Checker" }];
};

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return { mapList: await getMaps() };
}

export default function Maps() {
  const { mapList = [] } = useLoaderData<typeof loader>();

  const [openMaps, setOpenMaps] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(mapList.map((m) => [m.ingameId, true])),
  );

  const allOpen = mapList.length > 0 && mapList.every((m) => openMaps[m.ingameId]);

  function toggleAll() {
    const next = !allOpen;
    setOpenMaps(Object.fromEntries(mapList.map((m) => [m.ingameId, next])));
  }

  function setMapOpen(ingameId: string, value: boolean) {
    setOpenMaps((prev) => ({ ...prev, [ingameId]: value }));
  }

  return (
    <PageContainer>
      <div className="flex items-center gap-4 mb-6">
        <h1 className="font-heading text-2xl font-semibold flex-1">Maps</h1>
        {mapList.length > 0 && (
          <Button variant="outline" size="sm" onClick={toggleAll}>
            {allOpen ? "Collapse all" : "Expand all"}
          </Button>
        )}
      </div>

      {mapList.length === 0 ? (
        <Alert>
          <AlertDescription>No maps found.</AlertDescription>
        </Alert>
      ) : (
        <div className="flex flex-col gap-3">
          {mapList.map((map) => (
            <Collapsible
              key={map.ingameId}
              open={openMaps[map.ingameId]}
              onOpenChange={(v) => setMapOpen(map.ingameId, v)}
              className="rounded-xl ring-1 ring-foreground/10 bg-card overflow-hidden"
            >
              <CollapsibleTrigger className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-heading font-medium hover:bg-muted/50 transition-colors">
                <IconChevronRight
                  className={cn(
                    "size-4 shrink-0 text-muted-foreground transition-transform",
                    openMaps[map.ingameId] && "rotate-90",
                  )}
                />
                {map.tmxName ?? map.ingameName}
              </CollapsibleTrigger>

              <CollapsibleContent>
                <Separator />
                <div className="flex flex-col gap-4 p-4 md:flex-row md:items-start">
                  <MapThumbnail
                    tmxId={map.tmxId}
                    name={map.tmxName ?? map.ingameName}
                    className="w-full md:w-40"
                  />

                  <div className="flex flex-col gap-3 flex-1 text-sm">
                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                      <dt className="text-muted-foreground">Author time</dt>
                      <dd>{formatTime(map.authorTimeMs)}</dd>
                      {map.worldRecordTimeMs && (
                        <>
                          <dt className="text-muted-foreground">World record</dt>
                          <dd>
                            {map.worldRecordPlayerName}, {formatTime(map.worldRecordTimeMs)}
                          </dd>
                        </>
                      )}
                    </dl>

                    <Link
                      to={`/records/${map.ingameId}`}
                      className="text-primary underline-offset-4 hover:underline w-fit"
                    >
                      See all records
                    </Link>

                    <Separator />

                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
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
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
