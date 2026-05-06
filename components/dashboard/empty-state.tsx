import * as React from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title = "No data",
  description = "Nothing to show for the current filters.",
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex h-full min-h-[160px] flex-col items-center justify-center rounded-md border border-dashed bg-muted/30 p-6 text-center",
        className,
      )}
    >
      {icon ? <div className="mb-2 text-muted-foreground">{icon}</div> : null}
      <div className="text-sm font-medium text-foreground">{title}</div>
      <div className="text-xs text-muted-foreground">{description}</div>
    </div>
  );
}
