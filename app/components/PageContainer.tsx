import type { ReactNode } from "react";
import { cn } from "~/lib/utils";

export function PageContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <main className={cn("mx-auto max-w-5xl px-4 py-8 md:px-6", className)}>{children}</main>;
}
