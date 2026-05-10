export function MapExternalLinks({
  tmxId,
  ingameId,
}: {
  tmxId: number | string;
  ingameId: string;
}) {
  return (
    <div className="flex gap-3">
      <a
        href={`https://trackmania.exchange/maps/${tmxId}`}
        className="text-primary underline-offset-4 hover:underline"
      >
        TMX
      </a>
      <a
        href={`https://trackmania.io/#/leaderboard/${ingameId}`}
        className="text-primary underline-offset-4 hover:underline"
      >
        Trackmania.io
      </a>
    </div>
  );
}
