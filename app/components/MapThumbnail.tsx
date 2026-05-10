import { cn } from "~/lib/utils";
import { AspectRatio } from "~/components/ui/aspect-ratio";

export function MapThumbnail({
  tmxId,
  name,
  className,
}: {
  tmxId: number | string;
  name: string;
  className?: string;
}) {
  return (
    <div className={cn("shrink-0", className)}>
      <AspectRatio ratio={1}>
        <img
          src={`https://trackmania.exchange/mapimage/${tmxId}`}
          alt={name}
          className="size-full rounded-lg object-cover"
        />
      </AspectRatio>
    </div>
  );
}
